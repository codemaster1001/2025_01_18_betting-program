import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorError } from "@coral-xyz/anchor";
import { BettingProgram } from "../target/types/betting_program";
import * as sb from "@switchboard-xyz/on-demand";
import { PublicKey, SystemProgram, Connection } from "@solana/web3.js";
import { assert } from "chai";
import { confirmTransaction } from "@solana-developers/helpers";

const provider = anchor.AnchorProvider.env();
anchor.setProvider(provider);
const payer = anchor.Wallet.local().payer;

const program = anchor.workspace.BettingProgram as Program<BettingProgram>;