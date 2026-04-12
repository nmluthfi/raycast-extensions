import fetch from "node-fetch";
import { IHttpClient } from "./interfaces";

export class HttpClient implements IHttpClient {
  public async get<T>(url: string): Promise<T> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }
    return (await response.json()) as T;
  }
}
