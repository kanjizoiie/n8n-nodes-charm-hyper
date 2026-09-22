import type { INodeProperties } from 'n8n-workflow';

type DisplayOptions = INodeProperties['displayOptions'];

const CONVERSATION_ROLES = [
	{ name: 'Assistant', value: 'assistant' },
	{ name: 'System', value: 'system' },
	{ name: 'User', value: 'user' },
];

const ANTHROPIC_ROLES = [
	{ name: 'Assistant', value: 'assistant' },
	{ name: 'User', value: 'user' },
];

function messagesField(
	displayOptions: DisplayOptions,
	roles: Array<{ name: string; value: string }> = CONVERSATION_ROLES,
): INodeProperties {
	return {
		displayName: 'Messages',
		name: 'messages',
		type: 'fixedCollection',
		typeOptions: { multipleValues: true, sortable: true },
		placeholder: 'Add Message',
		default: {},
		required: true,
		description: 'The conversation history to send to the model',
		displayOptions,
		options: [
			{
				displayName: 'Message',
				name: 'values',
				values: [
					{
						displayName: 'Role',
						name: 'role',
						type: 'options',
						options: roles,
						default: 'user',
						description: 'Who authored the message',
					},
					{
						displayName: 'Content',
						name: 'content',
						type: 'string',
						typeOptions: { rows: 3 },
						default: '',
						description: 'The text of the message',
					},
				],
			},
		],
	};
}

const ADDITIONAL_BODY_OPTION: INodeProperties = {
	displayName: 'Additional Body Parameters',
	name: 'additionalBody',
	type: 'json',
	default: '{}',
	description:
		'Any extra JSON fields to merge into the request body, for parameters not exposed here. Applied last, so it can override the fields above.',
};

function modelField(displayOptions: DisplayOptions): INodeProperties {
	return {
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getModels' },
		default: '',
		required: true,
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
		displayOptions,
	};
}

function stopSequencesOption(): INodeProperties {
	return {
		displayName: 'Stop Sequences',
		name: 'stopSequences',
		type: 'string',
		default: '',
		description:
			'Sequences that stop generation. Separate multiple sequences with newlines or commas.',
	};
}

export const chatDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['chat'] } },
		options: [
			{
				name: 'Complete',
				value: 'complete',
				action: 'Create a chat completion',
				description: 'Send a conversation to a model and return the assistant reply',
			},
		],
		default: 'complete',
	},
	modelField({ show: { resource: ['chat'], operation: ['complete'] } }),
	messagesField({ show: { resource: ['chat'], operation: ['complete'] } }),
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['chat'], operation: ['complete'] } },
		options: [
			ADDITIONAL_BODY_OPTION,
			{
				displayName: 'Frequency Penalty',
				name: 'frequencyPenalty',
				type: 'number',
				typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
				default: 0,
				description: 'Penalise tokens by how often they already appeared. Between -2 and 2.',
			},
			{
				displayName: 'Max Output Tokens',
				name: 'maxOutputTokens',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 0,
				description: 'Upper bound on generated tokens. Leave at 0 to let the model decide.',
			},
			{
				displayName: 'Presence Penalty',
				name: 'presencePenalty',
				type: 'number',
				typeOptions: { minValue: -2, maxValue: 2, numberPrecision: 2 },
				default: 0,
				description: 'Penalise tokens that already appeared at all. Between -2 and 2.',
			},
			{
				displayName: 'Response Format',
				name: 'responseFormat',
				type: 'options',
				options: [
					{ name: 'JSON Object', value: 'json_object' },
					{ name: 'Text', value: 'text' },
				],
				default: 'text',
				description: 'The format the model must respond in',
			},
			stopSequencesOption(),
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
				default: 0.7,
				description: 'Sampling temperature. Lower is more deterministic. Between 0 and 2.',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 1,
				description: 'Nucleus sampling probability mass. Between 0 and 1.',
			},
		],
	},
];

export const responseDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['response'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a response',
				description: 'Create a model response using the OpenAI Responses API',
			},
		],
		default: 'create',
	},
	modelField({ show: { resource: ['response'], operation: ['create'] } }),
	{
		displayName: 'Input Type',
		name: 'inputType',
		type: 'options',
		noDataExpression: true,
		options: [
			{ name: 'Messages', value: 'messages' },
			{ name: 'Text', value: 'text' },
		],
		default: 'text',
		description: 'Whether to send a single text prompt or a full message history',
		displayOptions: { show: { resource: ['response'], operation: ['create'] } },
	},
	{
		displayName: 'Input',
		name: 'input',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		description: 'The prompt to send to the model',
		displayOptions: {
			show: { resource: ['response'], operation: ['create'], inputType: ['text'] },
		},
	},
	messagesField({
		show: { resource: ['response'], operation: ['create'], inputType: ['messages'] },
	}),
	{
		displayName: 'Instructions',
		name: 'instructions',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'A system-level instruction that shapes the response',
		displayOptions: { show: { resource: ['response'], operation: ['create'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['response'], operation: ['create'] } },
		options: [
			ADDITIONAL_BODY_OPTION,
			{
				displayName: 'Max Output Tokens',
				name: 'maxOutputTokens',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 0,
				description: 'Upper bound on generated tokens. Leave at 0 to let the model decide.',
			},
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 2, numberPrecision: 2 },
				default: 0.7,
				description: 'Sampling temperature. Lower is more deterministic. Between 0 and 2.',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 1,
				description: 'Nucleus sampling probability mass. Between 0 and 1.',
			},
		],
	},
];

export const messageDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['message'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a message',
				description: 'Create a message using the Anthropic Messages API',
			},
		],
		default: 'create',
	},
	modelField({ show: { resource: ['message'], operation: ['create'] } }),
	{
		displayName: 'Max Tokens',
		name: 'maxTokens',
		type: 'number',
		typeOptions: { minValue: 1 },
		default: 1024,
		required: true,
		description: 'The maximum number of tokens to generate. Required by the Anthropic API.',
		displayOptions: { show: { resource: ['message'], operation: ['create'] } },
	},
	messagesField({ show: { resource: ['message'], operation: ['create'] } }, ANTHROPIC_ROLES),
	{
		displayName: 'System',
		name: 'system',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		description: 'A system prompt that primes the model',
		displayOptions: { show: { resource: ['message'], operation: ['create'] } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: { resource: ['message'], operation: ['create'] } },
		options: [
			ADDITIONAL_BODY_OPTION,
			stopSequencesOption(),
			{
				displayName: 'Temperature',
				name: 'temperature',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 1,
				description: 'Sampling temperature. Lower is more deterministic. Between 0 and 1.',
			},
			{
				displayName: 'Top K',
				name: 'topK',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: 0,
				description: 'Only sample from the top K tokens. Leave at 0 to disable.',
			},
			{
				displayName: 'Top P',
				name: 'topP',
				type: 'number',
				typeOptions: { minValue: 0, maxValue: 1, numberPrecision: 2 },
				default: 1,
				description: 'Nucleus sampling probability mass. Between 0 and 1.',
			},
		],
	},
];

export const modelDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['model'] } },
		options: [
			{
				name: 'List',
				value: 'list',
				action: 'List models',
				description: 'List every model available in the Hyper catalogue with its pricing',
			},
		],
		default: 'list',
	},
];

export const creditDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['credit'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get the credit balance',
				description: 'Return the remaining Hypercredit balance for the authenticated team',
			},
		],
		default: 'get',
	},
];
