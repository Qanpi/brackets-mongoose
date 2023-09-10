const chai = require('chai');
const { Types } = require('mongoose');
chai.use(require('chai-as-promised'));

const assert = chai.assert;

const tournamentId = new Types.ObjectId().toString();

describe('BYE handling', function () {
    it('should propagate BYEs through the brackets', async function () {
        await this.manager.create.stage({
            name: 'Example with BYEs',
            tournamentId: tournamentId,
            type: 'double_elimination',
            seeding: [
                'Team 1', null,
                null, null,
            ],
            settings: { seedOrdering: ['natural'], grandFinal: 'simple' },
        });

        assert.strictEqual((await this.storage.select('match', 2)).opponent1.id, 0);
        assert.strictEqual((await this.storage.select('match', 2)).opponent2, null);

        assert.strictEqual((await this.storage.select('match', 3)).opponent1, null);
        assert.strictEqual((await this.storage.select('match', 3)).opponent2, null);

        assert.strictEqual((await this.storage.select('match', 4)).opponent1, null);
        assert.strictEqual((await this.storage.select('match', 4)).opponent2, null);

        assert.strictEqual((await this.storage.select('match', 5)).opponent1.id, 0);
        assert.strictEqual((await this.storage.select('match', 5)).opponent2, null);
    });

    it('should handle incomplete seeding during creation', async function () {
        await this.manager.create.stage({
            name: 'Example with BYEs',
            tournamentId: tournamentId,
            type: 'double_elimination',
            seeding: [
                'Team 1', 'Team 2',
            ],
            settings: {
                seedOrdering: ['natural'],
                balanceByes: false, // Default value.
                size: 4,
            },
        });

        assert.strictEqual((await this.storage.select('match', 0)).opponent1.id, 0);
        assert.strictEqual((await this.storage.select('match', 0)).opponent2.id, 1);

        assert.strictEqual((await this.storage.select('match', 1)).opponent1, null);
        assert.strictEqual((await this.storage.select('match', 1)).opponent2, null);
    });

    it('should balance BYEs in the seeding', async function () {
        await this.manager.create.stage({
            name: 'Example with BYEs',
            tournamentId: tournamentId,
            type: 'double_elimination',
            seeding: [
                'Team 1', 'Team 2',
            ],
            settings: {
                seedOrdering: ['natural'],
                balanceByes: true,
                size: 4,
            },
        });

        assert.strictEqual((await this.storage.select('match', 0)).opponent1.id, 0);
        assert.strictEqual((await this.storage.select('match', 0)).opponent2, null);

        assert.strictEqual((await this.storage.select('match', 1)).opponent1.id, 1);
        assert.strictEqual((await this.storage.select('match', 1)).opponent2, null);
    });
});

describe('Position checks', function () {
    before(async function () {
        await this.manager.create.stage({
            name: 'Example with double grand final',
            tournamentId: tournamentId,
            type: 'double_elimination',
            settings: {
                size: 8,
                grandFinal: 'simple',
                seedOrdering: ['natural'],
            },
        });
    });

    it('should not have a position when we don\'t need the origin of a participant', async function () {
        const matchFromWbRound2 = await this.storage.select('match', 4);
        assert.strictEqual(matchFromWbRound2.opponent1.position, undefined);
        assert.strictEqual(matchFromWbRound2.opponent2.position, undefined);

        const matchFromLbRound2 = await this.storage.select('match', 9);
        assert.strictEqual(matchFromLbRound2.opponent2.position, undefined);

        const matchFromGrandFinal = await this.storage.select('match', 13);
        assert.strictEqual(matchFromGrandFinal.opponent1.position, undefined);
    });

    it('should have a position where we need the origin of a participant', async function () {
        const matchFromWbRound1 = await this.storage.select('match', 0);
        assert.strictEqual(matchFromWbRound1.opponent1.position, 1);
        assert.strictEqual(matchFromWbRound1.opponent2.position, 2);

        const matchFromLbRound1 = await this.storage.select('match', 7);
        assert.strictEqual(matchFromLbRound1.opponent1.position, 1);
        assert.strictEqual(matchFromLbRound1.opponent2.position, 2);

        const matchFromLbRound2 = await this.storage.select('match', 9);
        assert.strictEqual(matchFromLbRound2.opponent1.position, 2);

        const matchFromGrandFinal = await this.storage.select('match', 13);
        assert.strictEqual(matchFromGrandFinal.opponent2.position, 1);
    });
});

describe('Special cases', function () {

    it('should create a stage and add participants IDs in seeding', async function () {
        const teams = [
            'Team 1', 'Team 2',
            'Team 3', 'Team 4',
            'Team 5', 'Team 6',
            'Team 7', 'Team 8',
        ];

        const participants = teams.map(name => ({
            tournament_id: 0,
            name,
        }));

        // Simulation of external database filling for participants.
        await this.storage.insert('participant', participants);

        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            settings: { size: 8 },
        });

        // Update seeding with already existing IDs.
        await this.manager.update.seeding(0, [0, 1, 2, 3, 4, 5, 6, 7]);

        assert.strictEqual((await this.storage.select('match', 0)).opponent1.id, 0);
    });

    it('should throw if the name of the stage is not provided', async function () {
        await assert.isRejected(this.manager.create.stage({
            tournamentId: tournamentId,
            type: 'single_elimination',
        }), 'You must provide a name for the stage.');
    });

    it('should throw if the tournament id of the stage is not provided', async function () {
        await assert.isRejected(this.manager.create.stage({
            name: 'Example',
            type: 'single_elimination',
        }), 'You must provide a tournament id for the stage.');
    });

    it('should throw if the participant count of a stage is not a power of two', async function () {
        await assert.isRejected(this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: [
                'Team 1', 'Team 2',
                'Team 3', 'Team 4',
                'Team 5', 'Team 6',
                'Team 7',
            ],
        }), 'The library only supports a participant count which is a power of two.');

        await assert.isRejected(this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            settings: { size: 3 },
        }), 'The library only supports a participant count which is a power of two.');
    });

    it('should throw if the participant count of a stage is less than two', async function () {
        await assert.isRejected(this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            settings: { size: 0 },
        }), 'Impossible to create an empty stage. If you want an empty seeding, just set the size of the stage.');

        await assert.isRejected(this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            settings: { size: 1 },
        }), 'Impossible to create a stage with less than 2 participants.');
    });
});

describe('Update match child count', function () {
    beforeEach(async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: [
                'Team 1', 'Team 2',
                'Team 3', 'Team 4',
                'Team 5', 'Team 6',
                'Team 7', 'Team 8',
            ],
            settings: { seedOrdering: ['natural'], matchesChildCount: 1 },
        });
    });

    it('should change match child count at match level', async function () {
        await this.manager.update.matchChildCount('match', 0, 3);
        assert.strictEqual((await this.storage.select('match', 0)).child_count, 3);
        assert.strictEqual((await this.storage.select('match_game')).length, 6 + 3);
    });

    it('should remove all child games of the match', async function () {
        await this.manager.update.matchChildCount('match', 0, 3); // Bo3
        await this.manager.update.matchChildCount('match', 0, 0); // No child games.
        assert.strictEqual((await this.storage.select('match', 0)).child_count, 0);
        assert.strictEqual((await this.storage.select('match_game')).length, 6);
    });

    it('should change match child count at round level', async function () {
        await this.manager.update.matchChildCount('round', 2, 3); // Round of id 2 in Bo3
        assert.strictEqual((await this.storage.select('match_game')).length, 6 + 3);

        await this.manager.update.matchChildCount('round', 1, 2); // Round of id 1 in Bo2
        assert.strictEqual((await this.storage.select('match_game')).length, 4 + 4 + 3);

        await this.manager.update.matchChildCount('round', 0, 0); // Round of id 0 in Bo0 (normal matches without games)
        assert.strictEqual((await this.storage.select('match_game')).length, 0 + 4 + 3);
    });

    it('should change match child count at group level', async function () {
        await this.manager.update.matchChildCount('group', 0, 4);
        assert.strictEqual((await this.storage.select('match_game')).length, 7 * 4);

        await this.manager.update.matchChildCount('group', 0, 2);
        assert.strictEqual((await this.storage.select('match_game')).length, 7 * 2);
    });

    it('should change match child count at stage level', async function () {
        await this.manager.update.matchChildCount('stage', 0, 4);
        assert.strictEqual((await this.storage.select('match_game')).length, 7 * 4);

        await this.manager.update.matchChildCount('stage', 0, 2);
        assert.strictEqual((await this.storage.select('match_game')).length, 7 * 2);
    });
});

describe('Seeding and ordering in elimination', function () {
    beforeEach(async function () {
        await this.manager.create.stage({
            name: 'Amateur',
            tournamentId: tournamentId,
            type: 'double_elimination',
            seeding: [
                'Team 1', 'Team 2', 'Team 3', 'Team 4',
                'Team 5', 'Team 6', 'Team 7', 'Team 8',
                'Team 9', 'Team 10', 'Team 11', 'Team 12',
                'Team 13', 'Team 14', 'Team 15', 'Team 16',
            ],
            settings: {
                seedOrdering: ['inner_outer', 'reverse', 'pair_flip', 'half_shift', 'reverse'],
            },
        });
    });

    it('should have the good orderings everywhere', async function () {
        const firstRoundMatchWB = await this.storage.select('match', 0);
        assert.strictEqual(firstRoundMatchWB.opponent1.position, 1);
        assert.strictEqual(firstRoundMatchWB.opponent2.position, 16);

        const firstRoundMatchLB = await this.storage.select('match', 15);
        assert.strictEqual(firstRoundMatchLB.opponent1.position, 8);
        assert.strictEqual(firstRoundMatchLB.opponent2.position, 7);

        const secondRoundMatchLB = await this.storage.select('match', 19);
        assert.strictEqual(secondRoundMatchLB.opponent1.position, 2);

        const secondRoundSecondMatchLB = await this.storage.select('match', 20);
        assert.strictEqual(secondRoundSecondMatchLB.opponent1.position, 1);

        const fourthRoundMatchLB = await this.storage.select('match', 25);
        assert.strictEqual(fourthRoundMatchLB.opponent1.position, 2);

        const finalRoundMatchLB = await this.storage.select('match', 28);
        assert.strictEqual(finalRoundMatchLB.opponent1.position, 1);
    });

    it('should update the orderings in rounds', async function () {
        let firstRoundMatchWB = await this.storage.select('match', 0);

        // Inner outer before changing.
        assert.strictEqual(firstRoundMatchWB.opponent1.position, 1);
        assert.strictEqual(firstRoundMatchWB.opponent2.position, 16);

        await this.manager.update.roundOrdering(0, 'pair_flip');

        firstRoundMatchWB = await this.storage.select('match', 0);

        // Should now be pair_flip.
        assert.strictEqual(firstRoundMatchWB.opponent1.position, 2);
        assert.strictEqual(firstRoundMatchWB.opponent2.position, 1);

        await this.manager.update.roundOrdering(5, 'reverse');

        const secondRoundMatchLB = await this.storage.select('match', 19);
        assert.strictEqual(secondRoundMatchLB.opponent1.position, 4);

        const secondRoundSecondMatchLB = await this.storage.select('match', 20);
        assert.strictEqual(secondRoundSecondMatchLB.opponent1.position, 3);
    });

    it('should throw if round does not support ordering', async function () {
        await assert.isRejected(
            this.manager.update.roundOrdering(6, 'natural'), // LB Round 2
            'This round does not support ordering.',
        );

        await assert.isRejected(
            this.manager.update.roundOrdering(9, 'natural'), // LB Round 6 (last minor round)
            'This round does not support ordering.',
        );
    });

    it('should throw if at least one match is running or completed', async function () {
        await this.manager.update.match({
            id: 0,
            opponent1: { score: 1 },
        });

        await assert.isRejected(this.manager.update.roundOrdering(0, 'natural'), 'At least one match has started or is completed.');

        await this.manager.update.match({
            id: 0,
            opponent1: { result: 'win' },
        });

        await assert.isRejected(this.manager.update.roundOrdering(0, 'natural'), 'At least one match has started or is completed.');
    });

    it('should update all the ordering of a stage at once', async function () {
        await this.manager.update.ordering(0, ['pair_flip', 'half_shift', 'reverse', 'natural']);

        const firstRoundMatchWB = await this.storage.select('match', 0);
        assert.strictEqual(firstRoundMatchWB.opponent1.position, 2);
        assert.strictEqual(firstRoundMatchWB.opponent2.position, 1);

        const firstRoundMatchLB = await this.storage.select('match', 15);
        assert.strictEqual(firstRoundMatchLB.opponent1.position, 5);
        assert.strictEqual(firstRoundMatchLB.opponent2.position, 6);

        const secondRoundMatchLB = await this.storage.select('match', 19);
        assert.strictEqual(secondRoundMatchLB.opponent1.position, 4);

        const secondRoundSecondMatchLB = await this.storage.select('match', 20);
        assert.strictEqual(secondRoundSecondMatchLB.opponent1.position, 3);

        const fourthRoundMatchLB = await this.storage.select('match', 25);
        assert.strictEqual(fourthRoundMatchLB.opponent1.position, 1);

        const finalRoundMatchLB = await this.storage.select('match', 28);
        assert.strictEqual(finalRoundMatchLB.opponent1.position, 1);
    });
});

describe('Best-Of series matches completion', function () {


    it('should end Bo1 matches', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                matchesChildCount: 1,
            },
        });

        await this.manager.update.matchGame({ id: 0, opponent1: { result: 'win' } });

        const match = await this.storage.select('match', 0);
        assert.strictEqual(match.opponent1.score, 1);
        assert.strictEqual(match.opponent2.score, 0);
        assert.strictEqual(match.opponent1.result, 'win');
    });

    it('should end Bo2 matches in round-robin stage', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'round_robin',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                matchesChildCount: 2, // Bo2
                groupCount: 1,
            },
        });

        await this.manager.update.matchGame({ id: 0, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ id: 1, opponent2: { result: 'win' } });

        const match = await this.storage.select('match', 0);
        assert.strictEqual(match.opponent1.score, 1);
        assert.strictEqual(match.opponent2.score, 1);
        assert.strictEqual(match.opponent1.result, 'draw');
        assert.strictEqual(match.opponent2.result, 'draw');
    });

    it('should throw if a BoX match has a tie in an elimination stage', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                matchesChildCount: 2, // Bo2
            },
        });

        await this.manager.update.matchGame({ id: 0, opponent1: { result: 'win' } });

        await assert.isRejected(this.manager.update.matchGame({
            id: 1,
            opponent2: { result: 'win' },
        }), 'Match games result in a tie for the parent match.');
    });

    it('should end Bo3 matches', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                matchesChildCount: 3,
            },
        });

        await this.manager.update.matchGame({ parent_id: 0, number: 1, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 0, number: 2, opponent1: { result: 'win' } });

        const firstMatch = await this.storage.select('match', 0);
        assert.strictEqual(firstMatch.opponent1.score, 2);
        assert.strictEqual(firstMatch.opponent2.score, 0);
        assert.strictEqual(firstMatch.opponent1.result, 'win');

        await this.manager.update.matchGame({ parent_id: 1, number: 1, opponent2: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 1, number: 2, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 1, number: 3, opponent1: { result: 'win' } });

        const secondMatch = await this.storage.select('match', 1);
        assert.strictEqual(secondMatch.opponent1.score, 2);
        assert.strictEqual(secondMatch.opponent2.score, 1);
        assert.strictEqual(secondMatch.opponent1.result, 'win');
    });

    it('should let the last match be played even if not necessary', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                matchesChildCount: 3,
            },
        });

        await this.manager.update.matchGame({ parent_id: 0, number: 1, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 0, number: 2, opponent1: { result: 'win' } });

        let match = await this.storage.select('match', 0);
        assert.strictEqual(match.opponent1.score, 2);
        assert.strictEqual(match.opponent2.score, 0);
        assert.strictEqual(match.opponent1.result, 'win');

        await this.manager.update.matchGame({ parent_id: 0, number: 3, opponent2: { result: 'win' } });

        match = await this.storage.select('match', 0);
        assert.strictEqual(match.opponent1.score, 2);
        assert.strictEqual(match.opponent2.score, 1);
        assert.strictEqual(match.opponent1.result, 'win');
    });

    it('should end Bo5 matches', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                matchesChildCount: 5,
            },
        });

        await this.manager.update.matchGame({ parent_id: 0, number: 1, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 0, number: 2, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 0, number: 3, opponent1: { result: 'win' } });

        const firstMatch = await this.storage.select('match', 0);
        assert.strictEqual(firstMatch.opponent1.score, 3);
        assert.strictEqual(firstMatch.opponent2.score, 0);
        assert.strictEqual(firstMatch.opponent1.result, 'win');

        await this.manager.update.matchGame({ parent_id: 1, number: 1, opponent2: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 1, number: 2, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 1, number: 3, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 1, number: 4, opponent1: { result: 'win' } });

        const secondMatch = await this.storage.select('match', 1);
        assert.strictEqual(secondMatch.opponent1.score, 3);
        assert.strictEqual(secondMatch.opponent2.score, 1);
        assert.strictEqual(secondMatch.opponent1.result, 'win');

        await this.manager.update.matchGame({ parent_id: 2, number: 1, opponent2: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 2, number: 2, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 2, number: 3, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 2, number: 4, opponent2: { result: 'win' } });
        await this.manager.update.matchGame({ parent_id: 2, number: 5, opponent1: { result: 'win' } });

        const thirdMatch = await this.storage.select('match', 2);
        assert.strictEqual(thirdMatch.opponent1.score, 3);
        assert.strictEqual(thirdMatch.opponent2.score, 2);
        assert.strictEqual(thirdMatch.opponent1.result, 'win');
    });

    it('should handle match auto-win against a BYE after a BoX series', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2'],
            settings: {
                seedOrdering: ['natural'],
                matchesChildCount: 3,
                size: 8,
                consolationFinal: true,
            },
        });

        await this.manager.update.matchGame({ id: 0, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ id: 1, opponent1: { result: 'win' } });

        assert.strictEqual((await this.storage.select('match', 4)).opponent1.result, 'win');
        assert.strictEqual((await this.storage.select('match', 6)).opponent1.result, 'win');
    });
});

describe('Reset match and match games', function () {

    it('should reset results of a match', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2'],
            settings: {
                seedOrdering: ['natural'],
                size: 8,
            },
        });

        await this.manager.update.match({
            id: 0,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        let match = await this.storage.select('match', 0);
        assert.strictEqual(match.opponent1.score, 16);
        assert.strictEqual(match.opponent2.score, 12);
        assert.strictEqual(match.opponent1.result, 'win');

        let semi1 = await this.storage.select('match', 4);
        assert.strictEqual(semi1.opponent1.result, 'win');
        assert.strictEqual(semi1.opponent2, null);

        let final = await this.storage.select('match', 6);
        assert.strictEqual(final.opponent1.result, 'win');
        assert.strictEqual(final.opponent2, null);

        await this.manager.reset.matchResults(0); // Score stays as is.

        match = await this.storage.select('match', 0);
        assert.strictEqual(match.opponent1.score, 16);
        assert.strictEqual(match.opponent2.score, 12);
        assert.strictEqual(match.opponent1.result, undefined);

        semi1 = await this.storage.select('match', 4);
        assert.strictEqual(semi1.opponent1.result, undefined);
        assert.strictEqual(semi1.opponent2, null);

        final = await this.storage.select('match', 6);
        assert.strictEqual(final.opponent1.result, undefined);
        assert.strictEqual(final.opponent2, null);
    });

    it('should throw when at least one of the following match is locked', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                seedOrdering: ['natural'],
            },
        });

        await this.manager.update.match({
            id: 0,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        await this.manager.update.match({
            id: 1,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        await this.manager.update.match({
            id: 2,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        await assert.isRejected(this.manager.reset.matchResults(0), 'The match is locked.');
    });

    it('should reset results of a match game', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2'],
            settings: {
                seedOrdering: ['natural'],
                matchesChildCount: 3,
                consolationFinal: true,
                size: 8,
            },
        });

        await this.manager.update.matchGame({ id: 0, opponent1: { result: 'win' } });
        await this.manager.update.matchGame({ id: 1, opponent1: { result: 'win' } });

        assert.strictEqual((await this.storage.select('match', 4)).opponent1.result, 'win');
        assert.strictEqual((await this.storage.select('match', 6)).opponent1.result, 'win');
        assert.strictEqual((await this.storage.select('match', 7)).opponent1, null); // BYE in consolation final.

        await this.manager.reset.matchGameResults(1);

        assert.strictEqual((await this.storage.select('match', 4)).opponent1.result, undefined);
        assert.strictEqual((await this.storage.select('match', 6)).opponent1.result, undefined);
        assert.strictEqual((await this.storage.select('match', 7)).opponent1, null); // Still BYE in consolation final.
    });
});

describe('Import / export', function () {

    it('should import data in the this.storage', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                seedOrdering: ['natural'],
                matchesChildCount: 1,
            },
        });

        const initialData = await this.manager.get.stageData(0);

        await this.manager.update.match({
            id: 0,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        await this.manager.update.match({
            id: 1,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        await this.manager.update.match({
            id: 2,
            opponent1: { score: 16, result: 'win' },
            opponent2: { score: 12 },
        });

        assert.strictEqual((await this.storage.select('match', 0)).opponent1.result, 'win');
        assert.strictEqual((await this.storage.select('match', 1)).opponent1.result, 'win');

        await this.manager.import(initialData);

        assert.strictEqual((await this.storage.select('match', 0)).opponent1.result, undefined);
        assert.strictEqual((await this.storage.select('match', 1)).opponent1.result, undefined);
    });

    it('should import data in the this.storage with normalized IDs', async function () {
        await this.storage.insert('participant', { name: 'Unused team' });

        await this.manager.create.stage({
            name: 'Example 1',
            tournamentId: tournamentId,
            type: 'round_robin',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                groupCount: 1,
                matchesChildCount: 1,
            },
        });

        await this.manager.create.stage({
            name: 'Example 2',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 5', 'Team 6', 'Team 7', 'Team 8'],
            settings: {
                seedOrdering: ['natural'],
                matchesChildCount: 1,
            },
        });

        const initialData = await this.manager.get.stageData(1);

        assert.strictEqual(initialData.stage[0].id, 1);
        assert.deepEqual(initialData.participant[0], { id: 1, tournament_id: 0, name: 'Team 1' });
        assert.deepEqual(initialData.group[0], { id: 1, stage_id: 1, number: 1 });
        assert.deepEqual(initialData.round[0], { id: 3, stage_id: 1, group_id: 1, number: 1 });
        assert.deepEqual(initialData.match[0], {
            id: 6,
            stage_id: 1,
            group_id: 1,
            round_id: 3,
            opponent1: { id: 5, position: 1 },
            opponent2: { id: 6, position: 2 },
            number: 1,
            status: 2,
            child_count: 1,
        });
        assert.deepEqual(initialData.match_game[0], {
            id: 6,
            number: 1,
            stage_id: 1,
            parent_id: 6,
            status: 2,
            opponent1: { id: 5 },
            opponent2: { id: 6 },
        });

        await this.manager.import(initialData, true);

        const data = await this.manager.get.stageData(0);

        assert.strictEqual(data.stage[0].id, 0);
        assert.deepEqual(data.participant[0], { id: 0, tournament_id: 0, name: 'Team 1' });
        assert.deepEqual(data.group[0], { id: 0, stage_id: 0, number: 1 });
        assert.deepEqual(data.round[0], { id: 0, stage_id: 0, group_id: 0, number: 1 });
        assert.deepEqual(data.match[0], {
            id: 0,
            stage_id: 0,
            group_id: 0,
            round_id: 0,
            opponent1: { id: 4, position: 1 },
            opponent2: { id: 5, position: 2 },
            number: 1,
            status: 2,
            child_count: 1,
        });
        assert.deepEqual(data.match_game[0], {
            id: 0,
            number: 1,
            stage_id: 0,
            parent_id: 0,
            status: 2,
            opponent1: { id: 4 },
            opponent2: { id: 5 },
        });
    });

    it('should export data from the this.storage', async function () {
        await this.manager.create.stage({
            name: 'Example',
            tournamentId: tournamentId,
            type: 'single_elimination',
            seeding: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
            settings: {
                seedOrdering: ['natural'],
                matchesChildCount: 2,
            },
        });

        const data = await this.manager.export();

        assert.containsAllKeys(data, ['participant', 'stage', 'group', 'round', 'match', 'match_game']);

        assert.deepEqual(await this.storage.select('participant'), data.participant);
        assert.deepEqual(await this.storage.select('stage'), data.stage);
        assert.deepEqual(await this.storage.select('group'), data.group);
        assert.deepEqual(await this.storage.select('round'), data.round);
        assert.deepEqual(await this.storage.select('match'), data.match);
        assert.deepEqual(await this.storage.select('match_game'), data.match_game);
    });
});
