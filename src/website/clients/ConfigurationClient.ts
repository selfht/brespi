import { Configuration } from "@/models/Configuration";
import { Yesttp } from "yesttp";

export class ConfigurationClient {
  public constructor(private readonly yesttp: Yesttp) {}

  public async get(): Promise<Configuration>;
  public async get(core: "core"): Promise<Configuration.Core>;
  public async get(core?: "core"): Promise<Configuration | Configuration.Core> {
    const { body } = await this.yesttp.get("/configuration");
    return core ? Configuration.Core.parse(body) : Configuration.parse(body);
  }
}
