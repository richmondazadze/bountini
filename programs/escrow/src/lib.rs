use anchor_lang::prelude::*;
use anchor_lang::system_program::{self, Transfer};
declare_id!("DYf6RhzG8RLw3zhoa2C9RDXWkBJ2Qgss9Mnmarbk7fce");
const DELIVERY:i64=1800;
const REVIEW:i64=600;
const REVISION:i64=600;
#[program]
pub mod bountini_escrow {
 use super::*;
 pub fn fund(ctx:Context<Fund>,id:[u8;16],requirements_hash:[u8;32],reward:u64)->Result<()> {
  require!(reward>0,EscrowError::InvalidReward);
  require!(requirements_hash!=[0;32],EscrowError::InvalidHash);
  let b=&mut ctx.accounts.bounty;
  b.id=id;b.requester=ctx.accounts.requester.key();b.worker=Pubkey::default();b.requirements_hash=requirements_hash;b.reward=reward;b.state=State::Open;b.deadline=0;b.revision_used=false;b.submission_hash=[0;32];b.feedback_hash=[0;32];b.bump=ctx.bumps.bounty;
  system_program::transfer(CpiContext::new(ctx.accounts.system_program.to_account_info(),Transfer{from:ctx.accounts.requester.to_account_info(),to:b.to_account_info()}),reward)?;
  Ok(())
 }
 pub fn claim(ctx:Context<Claim>)->Result<()> {
  let b=&mut ctx.accounts.bounty;require!(b.state==State::Open,EscrowError::WrongState);require!(b.worker==Pubkey::default(),EscrowError::AlreadyClaimed);require_keys_neq!(b.requester,ctx.accounts.worker.key(),EscrowError::SelfClaim);
  b.worker=ctx.accounts.worker.key();b.state=State::InProgress;b.deadline=deadline(Clock::get()?.unix_timestamp,DELIVERY)?;Ok(())
 }
 pub fn submit(ctx:Context<WorkerAction>,content_hash:[u8;32])->Result<()> {
  let b=&mut ctx.accounts.bounty;require!(b.state==State::InProgress||b.state==State::RevisionRequested,EscrowError::WrongState);require!(Clock::get()?.unix_timestamp<b.deadline,EscrowError::DeadlineReached);require!(content_hash!=[0;32],EscrowError::InvalidHash);
  b.submission_hash=content_hash;b.state=State::InReview;b.deadline=deadline(Clock::get()?.unix_timestamp,REVIEW)?;Ok(())
 }
 pub fn request_revision(ctx:Context<RequesterAction>,feedback_hash:[u8;32])->Result<()> {
  let b=&mut ctx.accounts.bounty;reviewable(b,Clock::get()?.unix_timestamp)?;require!(!b.revision_used,EscrowError::RevisionUsed);require!(feedback_hash!=[0;32],EscrowError::InvalidHash);
  b.feedback_hash=feedback_hash;b.revision_used=true;b.state=State::RevisionRequested;b.deadline=deadline(Clock::get()?.unix_timestamp,REVISION)?;Ok(())
 }
 pub fn reject(ctx:Context<RequesterAction>,feedback_hash:[u8;32])->Result<()> {
  let b=&mut ctx.accounts.bounty;reviewable(b,Clock::get()?.unix_timestamp)?;require!(feedback_hash!=[0;32],EscrowError::InvalidHash);b.feedback_hash=feedback_hash;Ok(())
 }
 pub fn approve(ctx:Context<Approve>)->Result<()> {
  reviewable(&ctx.accounts.bounty,Clock::get()?.unix_timestamp)?;
  settle(&mut ctx.accounts.bounty,&ctx.accounts.worker.to_account_info(),State::Paid)
 }
 pub fn cancel(ctx:Context<RequesterAction>)->Result<()> {
  require!(ctx.accounts.bounty.state==State::Open,EscrowError::WrongState);
  settle(&mut ctx.accounts.bounty,&ctx.accounts.requester.to_account_info(),State::Refunded)
 }
 pub fn expire(ctx:Context<RequesterAction>)->Result<()> {
  let b=&ctx.accounts.bounty;require!(matches!(b.state,State::InProgress|State::InReview|State::RevisionRequested),EscrowError::WrongState);require!(Clock::get()?.unix_timestamp>=b.deadline,EscrowError::TooEarly);
  settle(&mut ctx.accounts.bounty,&ctx.accounts.requester.to_account_info(),State::Refunded)
 }
 pub fn withdraw(ctx:Context<Withdraw>)->Result<()> {
  require!(matches!(ctx.accounts.bounty.state,State::InProgress|State::InReview|State::RevisionRequested),EscrowError::WrongState);
  settle(&mut ctx.accounts.bounty,&ctx.accounts.requester.to_account_info(),State::Refunded)
 }
}
fn deadline(now:i64,window:i64)->Result<i64>{now.checked_add(window).ok_or(error!(EscrowError::Overflow))}
fn reviewable(b:&Bounty,now:i64)->Result<()>{require!(b.state==State::InReview,EscrowError::WrongState);require!(now<b.deadline,EscrowError::DeadlineReached);Ok(())}
fn settle(b:&mut Account<Bounty>,recipient:&AccountInfo,state:State)->Result<()> {
 require!(!matches!(b.state,State::Paid|State::Refunded),EscrowError::AlreadySettled);
 let from=b.to_account_info();let remaining=from.lamports().checked_sub(b.reward).ok_or(error!(EscrowError::InsufficientEscrow))?;
 require!(remaining>=Rent::get()?.minimum_balance(from.data_len()),EscrowError::InsufficientEscrow);
 let credited=recipient.lamports().checked_add(b.reward).ok_or(error!(EscrowError::Overflow))?;
 **from.try_borrow_mut_lamports()?=remaining;**recipient.try_borrow_mut_lamports()?=credited;b.state=state;Ok(())
}
#[derive(Accounts)]
#[instruction(id:[u8;16])]
pub struct Fund<'info>{
 #[account(init,payer=requester,space=8+Bounty::INIT_SPACE,seeds=[b"bounty",requester.key().as_ref(),id.as_ref()],bump)] pub bounty:Account<'info,Bounty>,
 #[account(mut)] pub requester:Signer<'info>,pub system_program:Program<'info,System>
}
#[derive(Accounts)]
pub struct Claim<'info>{
 #[account(mut,seeds=[b"bounty",bounty.requester.as_ref(),bounty.id.as_ref()],bump=bounty.bump)] pub bounty:Account<'info,Bounty>,pub worker:Signer<'info>
}
#[derive(Accounts)]
pub struct WorkerAction<'info>{
 #[account(mut,has_one=worker,seeds=[b"bounty",bounty.requester.as_ref(),bounty.id.as_ref()],bump=bounty.bump)] pub bounty:Account<'info,Bounty>,pub worker:Signer<'info>
}
#[derive(Accounts)]
pub struct RequesterAction<'info>{
 #[account(mut,has_one=requester,seeds=[b"bounty",bounty.requester.as_ref(),bounty.id.as_ref()],bump=bounty.bump)] pub bounty:Account<'info,Bounty>,#[account(mut)] pub requester:Signer<'info>
}
#[derive(Accounts)]
pub struct Approve<'info>{
 #[account(mut,has_one=requester,has_one=worker,seeds=[b"bounty",bounty.requester.as_ref(),bounty.id.as_ref()],bump=bounty.bump)] pub bounty:Account<'info,Bounty>,pub requester:Signer<'info>,
 /// CHECK: exact assigned worker recipient is constrained by has_one; no signer required.
 #[account(mut)] pub worker:UncheckedAccount<'info>
}
#[derive(Accounts)]
pub struct Withdraw<'info>{
 #[account(mut,has_one=requester,has_one=worker,seeds=[b"bounty",bounty.requester.as_ref(),bounty.id.as_ref()],bump=bounty.bump)] pub bounty:Account<'info,Bounty>,pub worker:Signer<'info>,
 /// CHECK: exact requester refund recipient is constrained by has_one.
 #[account(mut)] pub requester:UncheckedAccount<'info>
}
#[account]
#[derive(InitSpace)]
pub struct Bounty{pub id:[u8;16],pub requester:Pubkey,pub worker:Pubkey,pub requirements_hash:[u8;32],pub reward:u64,pub state:State,pub deadline:i64,pub revision_used:bool,pub submission_hash:[u8;32],pub feedback_hash:[u8;32],pub bump:u8}
#[derive(AnchorSerialize,AnchorDeserialize,Clone,Copy,PartialEq,Eq,InitSpace,Debug)]
pub enum State{Open,InProgress,InReview,RevisionRequested,Paid,Refunded}
#[error_code]
pub enum EscrowError{
 #[msg("Reward must be positive")]InvalidReward,#[msg("Hash must not be empty")]InvalidHash,#[msg("Action is not allowed in this state")]WrongState,#[msg("A worker already claimed this bounty")]AlreadyClaimed,#[msg("Requester cannot claim their own bounty")]SelfClaim,#[msg("Deadline has been reached")]DeadlineReached,#[msg("The revision has already been used")]RevisionUsed,#[msg("Settlement already occurred")]AlreadySettled,#[msg("Expiry is not yet available")]TooEarly,#[msg("Arithmetic overflow")]Overflow,#[msg("Escrow does not hold the reward and rent")]InsufficientEscrow
}
#[cfg(test)] mod tests{use super::*;
 fn bounty(state:State)->Bounty{Bounty{id:[1;16],requester:Pubkey::new_unique(),worker:Pubkey::new_unique(),requirements_hash:[1;32],reward:1,state,deadline:1000,revision_used:false,submission_hash:[1;32],feedback_hash:[0;32],bump:1}}
 #[test] fn approval_boundary(){let b=bounty(State::InReview);assert!(reviewable(&b,999).is_ok());assert!(reviewable(&b,1000).is_err());assert!(reviewable(&b,1001).is_err());}
 #[test] fn terminal_cannot_be_reviewed(){assert!(reviewable(&bounty(State::Paid),999).is_err());assert!(reviewable(&bounty(State::Refunded),999).is_err());}
 #[test] fn timing_overflow(){assert!(deadline(i64::MAX,600).is_err());assert_eq!(deadline(1000,DELIVERY).unwrap(),2800);}
}
