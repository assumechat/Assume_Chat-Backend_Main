export const reputationAbi = [
    {
        type: 'function',
        name: 'updateInviteCountsBatch',
        inputs: [
            { name: 'players', type: 'address[]', internalType: 'address[]' },
            { name: 'inviteCounts', type: 'uint256[]', internalType: 'uint256[]' },
        ],
        outputs: [],
        stateMutability: 'nonpayable',
    },
] as const;
