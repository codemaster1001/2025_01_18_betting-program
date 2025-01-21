use crate::errors::*;
use crate::state::*;
use anchor_lang::prelude::*;
use rust_decimal::prelude::*;
use switchboard_on_demand::on_demand::accounts::pull_feed::PullFeedAccountData;
// -------------------------------------------------------------
//    CLOSE/END BETS (ADMIN-ONLY)
//    Typically might store final price snapshots here if the
//    market type is "Hilo" or "TokenFight".
// -------------------------------------------------------------

pub fn close_market_handler(ctx: Context<CloseMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    require!(
        ctx.accounts.authority.key() == crate::admin::id(),
        CustomError::Unauthorized
    );
    // No new bets can be placed

    // Optionally store first snapshot when TokenFight
    if market.market_type == MarketType::TokenFight {
        let feed_account1 = ctx.accounts.feed1.as_mut().unwrap();
        let feed_account2 = ctx.accounts.feed2.as_mut().unwrap();

        let feed_data1 = feed_account1.data.borrow();
        let feed_data2 = feed_account2.data.borrow();

        let feed1 = PullFeedAccountData::parse(feed_data1)
            .unwrap()
            .value()
            .unwrap();

        let feed2 = PullFeedAccountData::parse(feed_data2)
            .unwrap()
            .value()
            .unwrap();
        market.final_price_a_closed = feed1.to_f64();
        market.final_price_b_closed = feed2.to_f64();
    }

    market.status = MarketStatus::Closed;
    Ok(())
}

#[derive(Accounts)]
pub struct CloseMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,
    pub authority: Signer<'info>, // Must match market.authority
    ///CHECK: feed1
    pub feed1: Option<AccountInfo<'info>>,
    ///CHECK: feed1
    pub feed2: Option<AccountInfo<'info>>,
}
