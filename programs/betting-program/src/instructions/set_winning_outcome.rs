use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;

// -------------------------------------------------------------
//    SET WINNING OUTCOME (ONLY ADMIN)
// -------------------------------------------------------------
pub fn set_winning_outcome_handler(
    ctx: Context<SetWinningOutcome>,
    winning_outcome: u8,
) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == crate::admin::id(),
        CustomError::Unauthorized
    );
    let market = &mut ctx.accounts.market;
    require!(
        winning_outcome < market.outcomes.len() as u8,
        CustomError::InvalidOutcomeIndex
    );
    require!(
        market.status == MarketStatus::Settled,
        CustomError::MarketNotSettled
    );

    // Set the status to Settled
    market.status = MarketStatus::Confirmed;

    market.winning_outcome = Some(winning_outcome);

    Ok(())
}

#[derive(Accounts)]
pub struct SetWinningOutcome<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>,
}
