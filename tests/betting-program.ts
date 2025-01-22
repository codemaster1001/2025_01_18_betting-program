import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { assert } from "chai";
import { BettingProgram } from "../target/types/betting_program";

//mainnet
// const FEED1 = new PublicKey("Ceveqpim1FJZfx9DPeFDVDSz2HJavUqPPEJtZ2osNEmS");
// const FEED2 = new PublicKey("Hg8Kz1NaG3mnzJ34nzMRwTXByLTG1wrFnW4AgMfynoFz");

//devnet
const FEED1 = new PublicKey("DHB2Ph8CK7PmR3xswqcmDkgQeucnwSZtfnMpnc7mQgkb");
const FEED2 = new PublicKey("J9nrFWjDUeDVZ4BhhxsbQXWgLcLEgQyNBrCbwSADmJdr");

describe("Test Hilo Market", async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const payer = anchor.Wallet.local().payer;
    const program = anchor.workspace.BettingProgram as Program<BettingProgram>;
    const marketId = "12"
    const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        program.programId
    )
    const admin = payer;
    const user = Keypair.generate();
    const [betPda] = PublicKey.findProgramAddressSync([
        Buffer.from("bet"), user.publicKey.toBuffer(), marketPda.toBuffer()
    ], program.programId)
    const winningOutcome = 0;
    beforeEach(async () => {
        const latestBlockhash = await provider.connection.getLatestBlockhash("processed")
        const transferTx = new Transaction().add(SystemProgram.transfer({
            fromPubkey: admin.publicKey,
            toPubkey: user.publicKey,
            lamports: 0.5 * LAMPORTS_PER_SOL
        }))
        transferTx.feePayer = admin.publicKey;
        transferTx.recentBlockhash = latestBlockhash.blockhash;
        await sendAndConfirmTransaction(provider.connection, transferTx, [admin])
    })
    it("Create Hilo Market", async () => {
        // const airdropTxId = await provider.connection.requestAirdrop(user.publicKey, 5 * LAMPORTS_PER_SOL)
        // await confirmTransaction(provider.connection, airdropTxId, "processed")
        const createMarketArgs = {
            id: marketId,
            title: "SOL Hilo",
            description: "Solana above $260 on January 30?",
            imageLink: "https://ipfs.io/123123123",
            marketType: { hilo: {} },
            openTime: new BN(Math.floor(Date.now() / 1000) - 10),
            closeTime: new BN(Math.floor(Date.now() / 1000) + 3600),
            settleTime: new BN(Math.floor(Date.now() / 1000) + 7200),
            serviceFeeBps: 500,
            minBet: new BN(0.1 * LAMPORTS_PER_SOL),
            maxBet: new BN(10 * LAMPORTS_PER_SOL),
            totalMaxBet: new BN(100 * LAMPORTS_PER_SOL),
            outcomes: ["YES", "NO"]
        }

        const txId = await program.methods.createMarket(createMarketArgs).accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
        }).rpc()

        const marketAccount = await program.account.market.fetch(marketPda)
        assert(marketAccount.id == createMarketArgs.id)
        assert(marketAccount.status.opened)
        console.log(`CreateMarket: https://solscan.io/tx/${txId}`)
    })

    it("Place Bet on Yes", async () => {
        const outcomeIndex = 0;
        const amount = new BN(0.1 * LAMPORTS_PER_SOL);

        const tx = await program.methods.placeBet(outcomeIndex, amount).accountsPartial({
            bet: betPda,
            market: marketPda,
            user: user.publicKey
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.totalBetAmount.toString() == amount.toString())
        assert(betAccount.amountsPerOutcome[outcomeIndex].toString() == amount.toString())
    })

    it("Place Bet on No", async () => {
        const outcomeIndex = 1;
        const amount = new BN(0.1 * LAMPORTS_PER_SOL);
        const tx = await program.methods.placeBet(outcomeIndex, amount).accountsPartial({
            bet: betPda,
            market: marketPda,
            user: user.publicKey
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.amountsPerOutcome[outcomeIndex].toString() == amount.toString())
        assert(betAccount.totalBetAmount.toNumber() == amount.mul(new BN(2)).toNumber())

    })

    it("Close Hilo Market", async () => {
        const txId = await program.methods.closeMarket().accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
            feed1: null,
            feed2: null
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`ClosedPrice`, marketAccount.finalPriceAClosed);
        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.status.closed)
    })

    it("Settle Hilo Market", async () => {
        const txId = await program.methods.settleMarket().accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
            feed1: FEED1,
            feed2: null
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`SettledPrice`, marketAccount.finalPriceASettled);
        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.status.settled)
    })

    it("Set Winning Outcome", async () => {

        const txId = await program.methods.setWinningOutcome(winningOutcome).accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.winningOutcome == winningOutcome)
        assert(marketAccount.status.confirmed)
    })

    it("Claim reward", async () => {
        const beforeUserBalance = (await provider.connection.getBalance(user.publicKey, "processed"))
        const beforeAdminBalance = await provider.connection.getBalance(admin.publicKey, "processed")
        const tx = await program.methods.claimReward().accountsPartial({
            market: marketPda,
            bet: betPda,
            user: user.publicKey,
            authority: admin.publicKey,
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const afterUserBalance = await provider.connection.getBalance(user.publicKey, "processed")
        const afterAdminBalance = await provider.connection.getBalance(admin.publicKey, "processed")
        const marketAccount = await program.account.market.fetch(marketPda)
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.claimed)
        console.log(`User claimedAmount: ${afterUserBalance - beforeUserBalance}`)
        console.log(`Admin received feeAmount: ${afterAdminBalance - beforeAdminBalance}`)
    })
})


describe("Test TokenFight Market", async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const payer = anchor.Wallet.local().payer;
    const program = anchor.workspace.BettingProgram as Program<BettingProgram>;

    const marketId = "13"
    const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        program.programId
    )
    const admin = payer;
    const user = Keypair.generate();
    const [betPda] = PublicKey.findProgramAddressSync([
        Buffer.from("bet"), user.publicKey.toBuffer(), marketPda.toBuffer()
    ], program.programId)
    const winningOutcome = 0;
    beforeEach(async () => {
        const latestBlockhash = await provider.connection.getLatestBlockhash("processed")
        const transferTx = new Transaction().add(SystemProgram.transfer({
            fromPubkey: admin.publicKey,
            toPubkey: user.publicKey,
            lamports: 0.5 * LAMPORTS_PER_SOL
        }))
        transferTx.feePayer = admin.publicKey;
        transferTx.recentBlockhash = latestBlockhash.blockhash;
        await sendAndConfirmTransaction(provider.connection, transferTx, [admin])
    })
    it("Create TokenFight Market", async () => {
        // const airdropTxId = await provider.connection.requestAirdrop(user.publicKey, 5 * LAMPORTS_PER_SOL)
        // await confirmTransaction(provider.connection, airdropTxId, "processed")
        const createMarketArgs = {
            id: marketId,
            title: "SOL/JitoSol TokenFight",
            description: "Sol vs JitoSol, which token will gain more popularity?",
            imageLink: "https://ipfs.io/123123123",
            marketType: { tokenFight: {} },
            openTime: new BN(Math.floor(Date.now() / 1000) - 10),
            closeTime: new BN(Math.floor(Date.now() / 1000) + 3600),
            settleTime: new BN(Math.floor(Date.now() / 1000) + 7200),
            serviceFeeBps: 500,
            minBet: new BN(0.1 * LAMPORTS_PER_SOL),
            maxBet: new BN(10 * LAMPORTS_PER_SOL),
            totalMaxBet: new BN(100 * LAMPORTS_PER_SOL),
            outcomes: ["Sol", "JitoSol"]
        }

        const txId = await program.methods.createMarket(createMarketArgs).accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
        }).rpc()

        const marketAccount = await program.account.market.fetch(marketPda)
        assert(marketAccount.id == createMarketArgs.id)
        assert(marketAccount.status.opened)
        console.log(`CreateMarket: https://solscan.io/tx/${txId}`)
    })

    it("Place Bet on Sol", async () => {
        const outcomeIndex = 0;
        const amount = new BN(0.1 * LAMPORTS_PER_SOL);
        const tx = await program.methods.placeBet(outcomeIndex, amount).accountsPartial({
            bet: betPda,
            market: marketPda,
            user: user.publicKey
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.totalBetAmount.toString() == amount.toString())
        assert(betAccount.amountsPerOutcome[outcomeIndex].toString() == amount.toString())
    })

    it("Place Bet on JitoSol", async () => {
        const outcomeIndex = 1;
        const amount = new BN(0.1 * LAMPORTS_PER_SOL);
        const tx = await program.methods.placeBet(outcomeIndex, amount).accountsPartial({
            bet: betPda,
            market: marketPda,
            user: user.publicKey
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.amountsPerOutcome[outcomeIndex].toString() == amount.toString())
        assert(betAccount.totalBetAmount.toNumber() == amount.mul(new BN(2)).toNumber())

    })

    it("Close TokenFight Market", async () => {
        const txId = await program.methods.closeMarket().accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
            feed1: FEED1,
            feed2: FEED2
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`finalPriceAClosed`, marketAccount.finalPriceAClosed);
        console.log(`finalPriceBClosed`, marketAccount.finalPriceBClosed);
        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.status.closed)
    })

    it("Settle TokenFight Market", async () => {
        const txId = await program.methods.settleMarket().accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
            feed1: FEED1,
            feed2: FEED2
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`finalPriceASettled`, marketAccount.finalPriceASettled);
        console.log(`finalPriceBSettled`, marketAccount.finalPriceBSettled);
        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.status.settled)
    })

    it("Set Winning Outcome", async () => {

        const txId = await program.methods.setWinningOutcome(winningOutcome).accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.winningOutcome == winningOutcome)
        assert(marketAccount.status.confirmed)
    })

    it("Claim reward", async () => {
        const beforeUserBalance = (await provider.connection.getBalance(user.publicKey, "processed"))
        const beforeAdminBalance = await provider.connection.getBalance(admin.publicKey, "processed")
        const tx = await program.methods.claimReward().accountsPartial({
            market: marketPda,
            bet: betPda,
            user: user.publicKey,
            authority: admin.publicKey,
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const afterUserBalance = await provider.connection.getBalance(user.publicKey, "processed")
        const afterAdminBalance = await provider.connection.getBalance(admin.publicKey, "processed")
        const marketAccount = await program.account.market.fetch(marketPda)
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.claimed)
        console.log(`User claimedAmount: ${afterUserBalance - beforeUserBalance}`)
        console.log(`Admin received feeAmount: ${afterAdminBalance - beforeAdminBalance}`)
    })
})

describe("Test Custom Market", async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const payer = anchor.Wallet.local().payer;
    const program = anchor.workspace.BettingProgram as Program<BettingProgram>;
    const marketId = "14"
    const [marketPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market"), Buffer.from(marketId)],
        program.programId
    )
    const admin = payer;
    const user = Keypair.generate();
    const [betPda] = PublicKey.findProgramAddressSync([
        Buffer.from("bet"), user.publicKey.toBuffer(), marketPda.toBuffer()
    ], program.programId)
    const winningOutcome = 0;
    beforeEach(async () => {
        const latestBlockhash = await provider.connection.getLatestBlockhash("processed")
        const transferTx = new Transaction().add(SystemProgram.transfer({
            fromPubkey: admin.publicKey,
            toPubkey: user.publicKey,
            lamports: 0.5 * LAMPORTS_PER_SOL
        }))
        transferTx.feePayer = admin.publicKey;
        transferTx.recentBlockhash = latestBlockhash.blockhash;
        await sendAndConfirmTransaction(provider.connection, transferTx, [admin])
    })
    it("Create Custom Market", async () => {
        // const airdropTxId = await provider.connection.requestAirdrop(user.publicKey, 5 * LAMPORTS_PER_SOL)
        // await confirmTransaction(provider.connection, airdropTxId, "processed")
        const createMarketArgs = {
            id: marketId,
            title: "Custom Market",
            description: "$TRUMP FDV on Feburary 1?",
            imageLink: "https://ipfs.io/123123123",
            marketType: { custom: {} },
            openTime: new BN(Math.floor(Date.now() / 1000) - 10),
            closeTime: new BN(Math.floor(Date.now() / 1000) + 3600),
            settleTime: new BN(Math.floor(Date.now() / 1000) + 7200),
            serviceFeeBps: 500,
            minBet: new BN(0.1 * LAMPORTS_PER_SOL),
            maxBet: new BN(10 * LAMPORTS_PER_SOL),
            totalMaxBet: new BN(100 * LAMPORTS_PER_SOL),
            outcomes: ["<$5B", "$5-10B", "$10-15B", "$15-20B", "$20-25B", "$25B+"]
        }

        const txId = await program.methods.createMarket(createMarketArgs).accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
        }).rpc()

        const marketAccount = await program.account.market.fetch(marketPda)
        assert(marketAccount.id == createMarketArgs.id)
        assert(marketAccount.status.opened)
        console.log(`CreateMarket: https://solscan.io/tx/${txId}`)
    })

    it("Place Bet on <$5B", async () => {
        const outcomeIndex = 0;
        const amount = new BN(0.1 * LAMPORTS_PER_SOL);
        const tx = await program.methods.placeBet(outcomeIndex, amount).accountsPartial({
            bet: betPda,
            market: marketPda,
            user: user.publicKey
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.totalBetAmount.toString() == amount.toString())
        assert(betAccount.amountsPerOutcome[outcomeIndex].toString() == amount.toString())
    })

    it("Place Bet on $10-15B", async () => {
        const outcomeIndex = 2;
        const amount = new BN(0.1 * LAMPORTS_PER_SOL);
        const tx = await program.methods.placeBet(outcomeIndex, amount).accountsPartial({
            bet: betPda,
            market: marketPda,
            user: user.publicKey
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.amountsPerOutcome[outcomeIndex].toString() == amount.toString())
        assert(betAccount.totalBetAmount.toNumber() == amount.mul(new BN(2)).toNumber())

    })

    it("Close Custom Market", async () => {
        const txId = await program.methods.closeMarket().accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
            feed1: null,
            feed2: null
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)
        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.status.closed)
    })

    it("Settle Custom Market", async () => {
        const txId = await program.methods.settleMarket().accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
            feed1: null,
            feed2: null
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)
        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.status.settled)
    })

    it("Set Winning Outcome", async () => {

        const txId = await program.methods.setWinningOutcome(winningOutcome).accountsPartial({
            market: marketPda,
            authority: admin.publicKey,
        }).rpc();
        const marketAccount = await program.account.market.fetch(marketPda)

        console.log(`Market Status`, marketAccount.status);
        assert(marketAccount.winningOutcome == winningOutcome)
        assert(marketAccount.status.confirmed)
    })

    it("Claim reward", async () => {
        const beforeUserBalance = (await provider.connection.getBalance(user.publicKey, "processed"))
        const beforeAdminBalance = await provider.connection.getBalance(admin.publicKey, "processed")
        const tx = await program.methods.claimReward().accountsPartial({
            market: marketPda,
            bet: betPda,
            user: user.publicKey,
            authority: admin.publicKey,
        }).signers([user]).transaction();
        await sendAndConfirmTransaction(provider.connection, tx, [user])
        const afterUserBalance = await provider.connection.getBalance(user.publicKey, "processed")
        const afterAdminBalance = await provider.connection.getBalance(admin.publicKey, "processed")
        const marketAccount = await program.account.market.fetch(marketPda)
        const betAccount = await program.account.bet.fetch(betPda)
        assert(betAccount.claimed)
        console.log(`User claimedAmount: ${afterUserBalance - beforeUserBalance}`)
        console.log(`Admin received feeAmount: ${afterAdminBalance - beforeAdminBalance}`)
    })
})