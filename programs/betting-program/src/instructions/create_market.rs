use crate::constants::MAX_OUTCOME_LEN;
use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use anchor_lang::system_program;

// -------------------------------------------------------------
//    CREATE MARKET (ADMIN-ONLY)
// -------------------------------------------------------------

pub fn create_market_handler(ctx: Context<CreateMarket>, args: CreateMarketArgs) -> Result<()> {
    require!(
        ctx.accounts.authority.key() == crate::admin::id(),
        CustomError::Unauthorized
    );
    let market = &mut ctx.accounts.market;
    require!(
        args.outcomes.len() <= MAX_OUTCOME_LEN as usize,
        CustomError::OutcomeLenExceeded
    );

    // Store basic meta-data
    market.id = args.id;
    market.title = args.title;
    market.description = args.description;
    market.image_link = args.image_link;
    market.market_type = args.market_type;
    market.token_mint_a = args.token_mint_a;
    market.token_mint_b = args.token_mint_b;

    // Time windows
    market.open_time = args.open_time;
    market.close_time = args.close_time;
    market.settle_time = args.settle_time;

    // Limits
    market.service_fee_bps = args.service_fee_bps;
    market.min_bet = args.min_bet;
    market.max_bet = args.max_bet;
    market.total_max_bet = args.total_max_bet;
    market.total_bet_amount = 0;

    //prices of snapshot
    market.final_price_a_closed = None;
    market.final_price_b_closed = None;
    market.final_price_a_settled = None;
    market.final_price_b_settled = None;

    // Initialize outcomes
    market.outcomes = args.outcomes.clone(); // e.g. ["Yes", "No"] or more
    market.amounts_per_outcome = vec![0; args.outcomes.len()];

    // Initially, no winner is chosen
    market.winning_outcome = None;

    // Market is Open
    market.status = MarketStatus::Opened;

    Ok(())
}

#[derive(Accounts)]
#[instruction(args: CreateMarketArgs)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = authority,
        seeds = [b"market", args.id.as_bytes()],
        bump,
        space = 8 + Market::MAX_SIZE
    )]
    pub market: Account<'info, Market>,
    #[account(mut)]
    pub authority: Signer<'info>, // Admin who creates the market
    #[account(address = system_program::ID)]
    pub system_program: Program<'info, System>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateMarketArgs {
    pub id: String,
    pub title: String,
    pub description: String,
    pub image_link: String,
    pub market_type: MarketType, // e.g. Hilo, TokenFight, Custom
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,
    pub open_time: u64,
    pub close_time: u64,
    pub settle_time: u64,
    pub service_fee_bps: u16, // e.g. 500 = 5.00%
    pub min_bet: u64,
    pub max_bet: u64,
    pub total_max_bet: u64,
    pub outcomes: Vec<String>, // e.g. ["Yes", "No"]
}
