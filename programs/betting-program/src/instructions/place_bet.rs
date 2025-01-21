use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

// -------------------------------------------------------------
//    PLACE BET (ANY USER)
// -------------------------------------------------------------

pub fn place_bet_handler(ctx: Context<PlaceBet>, outcome_index: u8, amount: u64) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let bet_account = &mut ctx.accounts.bet;

    // Some basic validations
    require!(
        market.status == MarketStatus::Opened,
        CustomError::MarketNotOpen
    );
    require!(
        Clock::get()?.unix_timestamp as u64 >= market.open_time
            && Clock::get()?.unix_timestamp as u64 <= market.close_time,
        CustomError::OutsideBetWindow
    );
    require!(
        outcome_index < market.outcomes.len() as u8,
        CustomError::InvalidOutcomeIndex
    );
    require!(
        amount >= market.min_bet && amount <= market.max_bet,
        CustomError::BetAmountOutOfRange
    );
    require!(
        market.total_bet_amount + amount <= market.total_max_bet,
        CustomError::MaxPoolExceeded
    );

    // Transfer SOL from user to the program's PDA
    // We assume the "market" account is the PDA that holds funds,
    // or we have a separate "vault_pda". For simplicity, let's
    // directly send to market account:
    let ix = system_program::Transfer {
        from: ctx.accounts.user.to_account_info().clone(),
        to: market.to_account_info().clone(),
    };
    let cpi_ctx = CpiContext::new(ctx.accounts.system_program.to_account_info(), ix);
    system_program::transfer(cpi_ctx, amount)?;

    // Update market
    market.amounts_per_outcome[outcome_index as usize] += amount;
    market.total_bet_amount += amount;

    if bet_account.is_initialized == false {
        // Initialize bet account
        bet_account.is_initialized = true;
        bet_account.market = market.key();
        bet_account.bettor = ctx.accounts.user.key();
        bet_account.claimed = false;
        bet_account.bump = ctx.bumps.bet;
        bet_account.amounts_per_outcome = vec![0; market.outcomes.len()]
    }

    bet_account.amounts_per_outcome[outcome_index as usize] += amount;
    bet_account.total_bet_amount += amount;

    Ok(())
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    #[account(
        init_if_needed,
        payer = user,
        seeds = [b"bet", user.key().as_ref(), market.key().as_ref()],
        bump,
        space = 8 + Bet::MAX_SIZE
    )]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}
