import { Configuration } from "@/models/Configuration";
import { Yesttp } from "yesttp";

export class ConfigurationClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async get(): Promise<Configuration> {
    const { body } = await this.yesttp.get("/configuration");
    return Configuration.parse(body);
  }
}
