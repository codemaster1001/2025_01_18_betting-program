use anchor_lang::prelude::*;

#[error_code]
pub enum CustomError {
    #[msg("Market is not in Opened status.")]
    MarketNotOpen,
    #[msg("Current time is outside bet window.")]
    OutsideBetWindow,
    #[msg("Invalid outcome index.")]
    InvalidOutcomeIndex,
    #[msg("Bet amount out of allowed range.")]
    BetAmountOutOfRange,
    #[msg("Pool maximum exceeded.")]
    MaxPoolExceeded,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Market is not Closed.")]
    MarketNotClosed,
    #[msg("Market is not Settled.")]
    MarketNotSettled,
    #[msg("Market is not Confirmed.")]
    MarketNotConfirmed,
    #[msg("Winner not chosen.")]
    NoWinnerChosen,
    #[msg("Already claimed.")]
    AlreadyClaimed,
    #[msg("Numerical overflow.")]
    NumericalOverflow,
    #[msg("Numerical underflow.")]
    NumericalUnderflow,
    #[msg("Outcome len greater than 10")]
    OutcomeLenExceeded,
}
