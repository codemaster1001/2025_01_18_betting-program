use crate::constants::*;
use anchor_lang::prelude::*;

#[account]
pub struct Market {
    // Unique id for Market
    pub id: String,

    // Basic meta
    pub title: String,
    pub description: String,
    pub image_link: String,
    pub market_type: MarketType,
    pub token_mint_a: Pubkey,
    pub token_mint_b: Pubkey,

    // Time windows
    pub open_time: u64,
    pub close_time: u64,
    pub settle_time: u64,

    // Limits
    pub service_fee_bps: u16, // e.g. 5% = 500
    pub min_bet: u64,
    pub max_bet: u64,
    pub total_max_bet: u64,
    pub total_bet_amount: u64,

    // Snapshot prices for Hilo/TokenFight (optional)
    pub final_price_a_closed: Option<f64>,
    pub final_price_b_closed: Option<f64>,

    pub final_price_a_settled: Option<f64>,
    pub final_price_b_settled: Option<f64>,

    // The outcome strings
    pub outcomes: Vec<String>,
    // For each outcome, how many lamports have been bet
    pub amounts_per_outcome: Vec<u64>,

    // If settled, which outcome is the winner
    pub winning_outcome: Option<u8>,

    // Current market status
    pub status: MarketStatus,
}

impl Market {
    pub const MAX_SIZE: usize =
        // overhead
        (4 + 30) // market id
        + (4 + 100) // title (arbitrary max)
        + (4 + 500) // description (arbitrary max)
        + (4 + 100) // image_link
        + 1 // market_type enum
        + 32 // token_mint_a
        + 32 // token_mint_b
        + 8 // open_time
        + 8 // close_time
        + 8 // settle_time
        + 2 // service_fee_bps
        + 8 // min_bet
        + 8 // max_bet
        + 8 // total_max_bet
        + 8 // total_bet_amount
        + 1 + 8 // Option<u64> final_price_a_end
        + 1 + 8 // Option<u64> final_price_b_end        
        + 1 + 8 // Option<u64> final_price_a_settle
        + 1 + 8 // Option<u64> final_price_b_settle
        + (4 + MAX_OUTCOME_LEN as usize * 32) // outcomes vector overhead example (very approximate)
        + (4 + MAX_OUTCOME_LEN as usize * 8)  // amounts_per_outcome vector overhead (very approximate)
        + 1 // Option<u8> winning_outcome
        + 1 // MarketStatus
        + 100; // buffer
}

#[account]
pub struct Bet {
    pub is_initialized: bool,
    pub market: Pubkey,
    pub bettor: Pubkey,
    pub amounts_per_outcome: Vec<u64>,
    pub total_bet_amount: u64,
    pub claimed: bool,
    pub bump: u8,
}

impl Bet {
    pub const MAX_SIZE: usize = 1 // is_initialized
        + 32 // market
        + 32 // bettor
        + (4 + MAX_OUTCOME_LEN  as usize * 8)  // amounts_per_outcome
        + 8  // total_bet_amount
        + 1  // claimed
        + 1  // bump 
        + 50; // buffer
}

#[account]
pub struct Treasury {
    pub is_initialized: bool,
    pub amount: u64,
    pub bump: u8,
}
impl Treasury {
    pub const MAX_SIZE: usize = 1 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketStatus {
    Opened,
    Closed,
    Settled,
    Confirmed,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum MarketType {
    Hilo,
    TokenFight,
    Custom,
}
