# README

## Betting Program Documentation

This document outlines how to use the functions in the `BettingProgram` smart contract, tested using [Anchor](https://book.anchor-lang.com/) and the Solana Web3 libraries.

Below, we demonstrate:

1. **Creating** a market
2. **Placing** bets
3. **Closing** a market
4. **Settling** a market
5. **Setting** the winning outcome
6. **Claiming** rewards

Each market has various configurations, including **Hilo**, **TokenFight**, or **Custom** market types.

---

### Table of Contents

1. [Creating a Market](#creating-a-market)  
2. [Placing a Bet](#placing-a-bet)  
3. [Closing a Market](#closing-a-market)  
4. [Settling a Market](#settling-a-market)  
5. [Setting the Winning Outcome](#setting-the-winning-outcome)  
6. [Claiming Rewards](#claiming-rewards)  


## Creating a Market

Only admin can call this function

Use createMarket to open a new market. You need the following arguments:

- id (string)
- title (string)
- description (string)
- imageLink (string)
- marketType (e.g., { hilo: {} }, { tokenFight: {} }, or { custom: {} })
- openTime, closeTime, settleTime (all BN values representing Unix timestamps)
- serviceFeeBps (number - basis points for the house fee)
- minBet, maxBet, totalMaxBet (all BN values)
- outcomes (string array of possible outcomes)


## Placing a Bet

To place a bet, call placeBet with:

- outcomeIndex (number) — which outcome the user bets on
- amount (BN) — how many lamports to bet

## Closing a Market

Only admin can call this function

closeMarket prevents new bets from being placed. Typically called by the admin (authority) when it’s time to stop new bets.

-In TokenFight Market, you should pass both feed1 and feed2 addresses you can find on the [On-Demand Switchboard](https://ondemand.switchboard.xyz/solana/mainnet).
-In other markets, you can pass in the null for both feed1 and feed2

## Settling a Market

Only admin can call this function

settleMarket updates the final or official data (like final price) from oracles. After this step, the outcome can be decided.
-In TokenFight Market, you should pass both feed1 and feed2 addresses you can find on the [On-Demand Switchboard](https://ondemand.switchboard.xyz/solana/mainnet).
-In Hilo market, you should pass feed1 address to fetch the Oracle price

## Setting the Winning Outcome

Only admin can call this function

After you have final data, you call setWinningOutcome to declare which outcome index has won.

- winningOutcome (number)

## Claiming Rewards

Each user with a winning bet can call claimReward to retrieve their portion of the pool minus fees. The admin also receives the service fee.