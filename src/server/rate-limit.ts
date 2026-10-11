import { database, HttpError } from "./db";
export async function consumeRate(key: string, max: number) {
  const [row] =
    await database()`INSERT INTO app_rate_limits(key,window_start,count) VALUES(${key},now(),1) ON CONFLICT(key) DO UPDATE SET window_start=CASE WHEN app_rate_limits.window_start<now()-interval '1 minute' THEN now() ELSE app_rate_limits.window_start END,count=CASE WHEN app_rate_limits.window_start<now()-interval '1 minute' THEN 1 ELSE app_rate_limits.count+1 END RETURNING count`;
  if (Number(row.count) > max)
    throw new HttpError(429, "Please wait a minute before trying again");
}
