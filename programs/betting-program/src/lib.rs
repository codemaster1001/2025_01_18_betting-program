use anchor_lang::prelude::*;

declare_id!("9Nao5E2MknMC3wSUwf31PPu8BdX8pVHCNdZYAKoutbc8");

#[program]
pub mod betting_program {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
