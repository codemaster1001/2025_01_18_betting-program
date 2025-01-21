use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

// -------------------------------------------------------------
//    CLAIM REWARDS (WINNERS ONLY)
//    The user who placed the bet calls this.
//    The program checks if user bet on the winning outcome,
//    calculates share, deducts fee, and transfers SOL back.
// -------------------------------------------------------------

pub fn claim_reward_handler(ctx: Context<ClaimReward>) -> Result<()> {
    let market = &ctx.accounts.market;
    let treasury = &ctx.accounts.treasury;
    let bet_account = &mut ctx.accounts.bet;

    require!(
        market.status == MarketStatus::Confirmed,
        CustomError::MarketNotConfirmed
    );
    require!(!bet_account.claimed, CustomError::AlreadyClaimed);

    // Check if user bet on winning outcome
    let winning_outcome = market.winning_outcome.ok_or(CustomError::NoWinnerChosen)?;

    let user_win_amount = bet_account.amounts_per_outcome[winning_outcome as usize];

    // ---------------------------------------------------------
    // Calculate share of losing side
    // ---------------------------------------------------------
    let winning_pool = market.amounts_per_outcome[winning_outcome as usize];
    let total_pool: u64 = market.amounts_per_outcome.iter().sum();

    let losing_pool = total_pool - winning_pool;

    // Proportion of the winning side
    let user_share = user_win_amount as f64 / winning_pool as f64;
    let user_share_lamports = (user_share * losing_pool as f64) as u64;

    // Total user payout = user initial bet + share of losing side
    let raw_payout = user_win_amount + user_share_lamports;

    // ---------------------------------------------------------
    // Deduct service fee
    // service_fee_bps is e.g. 500 for 5.00%
    // ---------------------------------------------------------
    let service_fee = (raw_payout * market.service_fee_bps as u64) / 10_000;
    let payout_after_fee = raw_payout
        .checked_sub(service_fee)
        .ok_or(CustomError::NumericalUnderflow)?;

    // Transfer the user payout
    **treasury.to_account_info().try_borrow_mut_lamports()? -= payout_after_fee;
    **ctx
        .accounts
        .user
        .to_account_info()
        .try_borrow_mut_lamports()? += payout_after_fee;

    // Mark bet as claimed
    bet_account.claimed = true;

    Ok(())
}

#[derive(Accounts)]
pub struct ClaimReward<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(mut, seeds = [b"bet", user.key().as_ref(), market.key().as_ref()], bump = bet.bump, close = user)]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(mut, seeds=[b"treasury"], bump=treasury.bump)]
    pub treasury: Account<'info, Treasury>,
}
