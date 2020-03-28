import * as fs from "fs";
import * as path from "path";

import * as chai from "chai";
import * as dirtyChai from "dirty-chai";

import { ignore, read } from "../streams";

chai.use(dirtyChai);

const { expect } = chai;

describe("streams", () => {
  describe("ignore", () => {
    it("success", async () => {
      const stream = fs.createReadStream(path.resolve(__dirname, "test.txt"));
      const actual = await ignore(stream);
      expect(actual).to.be.undefined;
    });

    it("failure", async () => {
      const stream = fs.createReadStream(path.resolve(__dirname, "does-not-exist.txt"));
      try {
        await read(stream);
        throw new Error("Expected read to throw Error");
      } catch (err) {
        // expected
      }
    });
  });

  describe("read", () => {
    it("success", async () => {
      const stream = fs.createReadStream(path.resolve(__dirname, "test.txt"));
      const actual = await read(stream);
      expect(actual.toString("utf8")).to.be.equal("This is a test file.");
    });

    it("failure", async () => {
      const stream = fs.createReadStream(path.resolve(__dirname, "does-not-exist.txt"));
      try {
        await read(stream);
        throw new Error("Expected read to throw Error");
      } catch (err) {
        // expected
      }
    });
  });
});
