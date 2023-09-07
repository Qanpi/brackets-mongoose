const chai = require("chai");
chai.use(require("chai-as-promised"));
const { default: MongooseForBrackets } = require("../dist/index");
const { BracketsManager } = require("brackets-manager");
const {default: mongoose, Types} = require("mongoose");

const assert = chai.assert;

describe("Get child games", () => {
    before(() => {
        this.storage = new MongooseForBrackets(mongoose);
        this.manager = new BracketsManager(this.storage, true);
    });

    beforeEach(() => {
        this.storage.reset();
    });

    it.only("should get child games of a list of matches", async () => {
        const tournamentId = new Types.ObjectId();

        await this.manager.create.stage({
            name: "Example",
            tournamentId: tournamentId,
            type: "single_elimination",
            seeding: ["Team 1", "Team 2", "Team 3", "Team 4"],
            settings: { matchesChildCount: 2 },
        });

        const stage = await this.manager.get.currentStage(tournamentId);
        const round = await this.manager.get.currentRound(stage.id);

        const matches = await this.storage.select("match", { round_id: round.id });
        const games = await this.manager.get.matchGames(matches);

        assert.strictEqual(matches.length, 2);
        assert.strictEqual(games.length, 4);
        assert.strictEqual(games[2].parent_id.toString(), matches[1].id);
    });

    it("should get child games of a list of matches with some which do not have child games", async () => {
        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "single_elimination",
            seeding: ["Team 1", "Team 2", "Team 3", "Team 4"],
            settings: { matchesChildCount: 2 },
        });

        await this.manager.update.matchChildCount("match", 1, 0); // Remove child games from match id 1.

        const matches = await this.storage.select("match", { round_id: 0 });
        const games = await this.manager.get.matchGames(matches);

        assert.strictEqual(matches.length, 2);
        assert.strictEqual(games.length, 2); // Only two child games.
    });
});

describe("Get final standings", () => {
    beforeEach(() => {
        this.storage.reset();
    });

    it("should get the final standings for a single elimination stage with consolation final", async () => {
        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "single_elimination",
            seeding: [
                "Team 1",
                "Team 2",
                "Team 3",
                "Team 4",
                "Team 5",
                "Team 6",
                "Team 7",
                "Team 8",
            ],
            settings: { consolationFinal: true },
        });

        for (let i = 0; i < 8; i++) {
            await this.manager.update.match({
                id: i,
                ...(i % 2 === 0
                    ? { opponent1: { result: "win" } }
                    : { opponent2: { result: "win" } }),
            });
        }

        const finalStandings = await this.manager.get.finalStandings(0);

        assert.deepEqual(finalStandings, [
            { id: 0, name: "Team 1", rank: 1 },
            { id: 5, name: "Team 6", rank: 2 },

            // The consolation final has inverted those ones (rank 3).
            { id: 1, name: "Team 2", rank: 3 },
            { id: 4, name: "Team 5", rank: 4 },

            { id: 7, name: "Team 8", rank: 5 },
            { id: 3, name: "Team 4", rank: 5 },
            { id: 6, name: "Team 7", rank: 5 },
            { id: 2, name: "Team 3", rank: 5 },
        ]);
    });

    it("should get the final standings for a single elimination stage without consolation final", async () => {
        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "single_elimination",
            seeding: [
                "Team 1",
                "Team 2",
                "Team 3",
                "Team 4",
                "Team 5",
                "Team 6",
                "Team 7",
                "Team 8",
            ],
            settings: { consolationFinal: false },
        });

        for (let i = 0; i < 7; i++) {
            await this.manager.update.match({
                id: i,
                ...(i % 2 === 0
                    ? { opponent1: { result: "win" } }
                    : { opponent2: { result: "win" } }),
            });
        }

        const finalStandings = await this.manager.get.finalStandings(0);

        assert.deepEqual(finalStandings, [
            { id: 0, name: "Team 1", rank: 1 },
            { id: 5, name: "Team 6", rank: 2 },

            // Here, they are not inverted (rank 3).
            { id: 4, name: "Team 5", rank: 3 },
            { id: 1, name: "Team 2", rank: 3 },

            { id: 7, name: "Team 8", rank: 4 },
            { id: 3, name: "Team 4", rank: 4 },
            { id: 6, name: "Team 7", rank: 4 },
            { id: 2, name: "Team 3", rank: 4 },
        ]);
    });

    it("should get the final standings for a double elimination stage with a grand final", async () => {
        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "double_elimination",
            seeding: [
                "Team 1",
                "Team 2",
                "Team 3",
                "Team 4",
                "Team 5",
                "Team 6",
                "Team 7",
                "Team 8",
            ],
            settings: { grandFinal: "double" },
        });

        for (let i = 0; i < 15; i++) {
            await this.manager.update.match({
                id: i,
                ...(i % 2 === 0
                    ? { opponent1: { result: "win" } }
                    : { opponent2: { result: "win" } }),
            });
        }

        const finalStandings = await this.manager.get.finalStandings(0);

        assert.deepEqual(finalStandings, [
            { id: 0, name: "Team 1", rank: 1 },
            { id: 5, name: "Team 6", rank: 2 },
            { id: 4, name: "Team 5", rank: 3 },
            { id: 3, name: "Team 4", rank: 4 },
            { id: 1, name: "Team 2", rank: 5 },
            { id: 6, name: "Team 7", rank: 5 },
            { id: 7, name: "Team 8", rank: 6 },
            { id: 2, name: "Team 3", rank: 6 },
        ]);
    });

    it("should get the final standings for a double elimination stage without a grand final", async () => {
        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "double_elimination",
            seeding: [
                "Team 1",
                "Team 2",
                "Team 3",
                "Team 4",
                "Team 5",
                "Team 6",
                "Team 7",
                "Team 8",
            ],
            settings: { grandFinal: "none" },
        });

        for (let i = 0; i < 13; i++) {
            await this.manager.update.match({
                id: i,
                // The parity is reversed here, just to have different results.
                ...(i % 2 === 1
                    ? { opponent1: { result: "win" } }
                    : { opponent2: { result: "win" } }),
            });
        }

        const finalStandings = await this.manager.get.finalStandings(0);

        assert.deepEqual(finalStandings, [
            { id: 6, name: "Team 7", rank: 1 },
            { id: 2, name: "Team 3", rank: 2 },
            { id: 3, name: "Team 4", rank: 3 },
            { id: 5, name: "Team 6", rank: 4 },
            { id: 0, name: "Team 1", rank: 5 },
            { id: 7, name: "Team 8", rank: 5 },
            { id: 4, name: "Team 5", rank: 6 },
            { id: 1, name: "Team 2", rank: 6 },
        ]);
    });
});

describe("Get seeding", () => {
    it("should get the seeding of a round-robin stage", async () => {
        this.storage.reset();

        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "round_robin",
            settings: {
                groupCount: 8,
                size: 32,
                seedOrdering: ["groups.seed_optimized"],
            },
        });

        const seeding = await this.manager.get.seeding(0);
        assert.strictEqual(seeding.length, 32);
        assert.strictEqual(seeding[0].position, 1);
        assert.strictEqual(seeding[1].position, 2);
    });

    it("should get the seeding of a round-robin stage with BYEs", async () => {
        this.storage.reset();

        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "round_robin",
            settings: {
                groupCount: 2,
                size: 8,
            },
            seeding: ["Team 1", null, null, null, null, null, null, null],
        });

        const seeding = await this.manager.get.seeding(0);
        assert.strictEqual(seeding.length, 8);
    });

    it("should get the seeding of a round-robin stage with BYEs after update", async () => {
        this.storage.reset();

        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "round_robin",
            settings: {
                groupCount: 2,
                size: 8,
            },
        });

        await this.manager.update.seeding(0, [
            "Team 1",
            null,
            null,
            null,
            null,
            null,
            null,
            null,
        ]);

        const seeding = await this.manager.get.seeding(0);
        assert.strictEqual(seeding.length, 8);
    });

    it("should get the seeding of a single elimination stage", async () => {
        this.storage.reset();

        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "single_elimination",
            settings: { size: 16 },
        });

        const seeding = await this.manager.get.seeding(0);
        assert.strictEqual(seeding.length, 16);
        assert.strictEqual(seeding[0].position, 1);
        assert.strictEqual(seeding[1].position, 2);
    });

    it("should get the seeding with BYEs", async () => {
        this.storage.reset();

        await this.manager.create.stage({
            name: "Example",
            tournamentId: 0,
            type: "single_elimination",
            seeding: [
                "Team 1",
                null,
                "Team 3",
                "Team 4",
                "Team 5",
                null,
                null,
                "Team 8",
            ],
            settings: {
                seedOrdering: ["inner_outer"],
            },
        });

        const seeding = await this.manager.get.seeding(0);
        assert.strictEqual(seeding.length, 8);
        assert.deepStrictEqual(seeding, [
            { id: 0, position: 1 },
            null,
            { id: 1, position: 3 },
            { id: 2, position: 4 },
            { id: 3, position: 5 },
            null,
            null,
            { id: 4, position: 8 },
        ]);
    });
});
