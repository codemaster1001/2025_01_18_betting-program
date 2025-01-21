use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

pub mod admin {
    use anchor_lang::prelude::declare_id;
    declare_id!("keyJE5FjUjrUJyuawsMwLgdDuvZSEvmQaqjn9vpAAc3");
}

declare_id!("J5wNuWH7BezwFjAeSGvLP2FThJhPgSmAQLX7P9RixGoD");

#[program]
pub mod betting_program {
    use super::*;

    pub fn create_market(ctx: Context<CreateMarket>, args: CreateMarketArgs) -> Result<()> {
        create_market_handler(ctx, args)
    }

    pub fn close_market(ctx: Context<CloseMarket>) -> Result<()> {
        close_market_handler(ctx)
    }

    pub fn settle_market(ctx: Context<SettleMarket>) -> Result<()> {
        settle_market_handler(ctx)
    }

    pub fn set_winning_outcome(ctx: Context<SetWinningOutcome>, winning_outcome: u8) -> Result<()> {
        set_winning_outcome_handler(ctx, winning_outcome)
    }

    pub fn place_bet(ctx: Context<PlaceBet>, outcome_index: u8, amount: u64) -> Result<()> {
        place_bet_handler(ctx, outcome_index, amount)
    }

    pub fn claim_reward(ctx: Context<ClaimReward>) -> Result<()> {
        claim_reward_handler(ctx)
    }
}
