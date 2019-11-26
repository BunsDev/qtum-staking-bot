const { map } = require("bluebird");
const { DateTime } = require("luxon");
const fetch = require("node-fetch");

exports.handleGetLastValidatedBlock = async context => {
    try {
        const transactionLists = await map(
            process.env.ADDRESSES,
            async address => {
                // We assume that the latest stake tx is within the last 10 txs
                const response = await fetch(
                    `/address/${address}/txs?limit=10&offset=0`
                );
                if (!response.ok) {
                    throw new Error();
                }
                const data = await response.json();
                return data.transactions;
            }
        );
        const transactions = [].concat(...transactionLists);

        const stakeTxsTimestamps = await map(transactions, async tx => {
            const response = await fetch(`https://qtum.info/api/tx/${tx}`);
            if (!response.ok) {
                throw new Error();
            }
            const data = await response.json();
            if (data.isCoinstake) {
                return data.timestamp;
            }
        }).filter(tx => tx);

        const lastBlockDate = DateTime.fromSeconds(
            stakeTxsTimestamps[0]
        ).toFormat("dd/LL/yyyy");
        return context.replyWithMarkdown(
            `Last block validated at ${lastBlockDate.toString()}`
        );
    } catch (error) {
        return context.replyWithMarkdown(
            "An error occurred, please try again later..."
        );
    }
};
