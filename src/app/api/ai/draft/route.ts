import {z} from 'zod';
import {walletSession} from '@/server/auth';
import {failure,requireOrigin,jsonBody,HttpError} from '@/server/db';
import {gemini,quota,suggestedDraft} from '@/server/assistance';
export async function POST(request:Request){try{requireOrigin(request);const wallet=await walletSession();const p=z.object({text:z.string().trim().min(20).max(12000)}).safeParse(await jsonBody(request));if(!p.success)throw new HttpError(400,'Add at least 20 characters describing the task.');await quota(wallet,'draft');return Response.json(await gemini(suggestedDraft,'Extract a small, clear text-submission bounty. Preserve source text, dates, URLs and stated requirements. Do not invent reward amounts or facts. Return an editable proposal, never a final agreement.',p.data));}catch(e){return failure(e);}}
