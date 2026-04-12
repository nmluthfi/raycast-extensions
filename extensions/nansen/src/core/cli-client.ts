import { getPreferenceValues } from "@raycast/api";
import { execa } from "execa";
import { ICliClient } from "./interfaces";

export class CliClient implements ICliClient {
  public async execute<T>(
    command: string[],
    timeoutMs: number = 60_000,
  ): Promise<T> {
    const prefs = getPreferenceValues<Preferences>();
    if (!prefs.nansenApiKey) {
      throw new Error(
        "Missing Nansen API Key. Go to Raycast extension settings (Cmd + ,) and add your key.",
      );
    }

    const env: Record<string, string> = {
      ...process.env,
      PATH: `${process.env.PATH}:/usr/local/bin:/opt/homebrew/bin`,
      NANSEN_API_KEY: prefs.nansenApiKey,
    };

    let stdout: string;
    try {
      const result = await execa(command[0], command.slice(1), {
        env,
        timeout: timeoutMs,
      });
      stdout = result.stdout;
    } catch (execErr: any) {
      if (execErr.stdout) {
        stdout = execErr.stdout;
      } else {
        throw new Error(`CLI error: ${execErr.message}`);
      }
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(stdout);
    } catch {
      return stdout as unknown as T;
    }

    const envelope = parsed as {
      success?: boolean;
      error?: string;
      code?: string;
    };
    if (envelope.success === false && envelope.error) {
      throw new Error(envelope.error);
    }

    const successEnvelope = parsed as { success?: boolean; data?: T };
    if (
      successEnvelope.success === true &&
      successEnvelope.data !== undefined
    ) {
      return successEnvelope.data;
    }

    return parsed as T;
  }
}
