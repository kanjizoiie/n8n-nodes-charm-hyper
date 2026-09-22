import type {
	IDataObject,
	INodeProperties,
	INodeType,
	INodeTypeDescription,
	ISupplyDataFunctions,
	SupplyData,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';
import { supplyModel } from '@n8n/ai-node-sdk';
import {
	DEFAULT_BASE_URL,
	getModels,
	parseJsonField,
	parseStopSequences,
} from '../shared/GenericFunctions';

/** Options collection as the user sees it, before it is mapped onto the SDK's model options. */
type ModelOptions = {
	temperature?: number;
	maxOutputTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	stopSequences?: string;
	useResponsesApi?: boolean;
	additionalBody?: string | IDataObject;
};

const modelField: INodeProperties = {
	displayName: 'Model Name or ID',
	name: 'model',
	type: 'options',
	typeOptions: { loadOptionsMethod: 'getModels' },
	default: '',
	required: true,
	description:
		'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
};

const optionsCollection: INodeProperties = {
	displayName: 'Options',
	name: 'options',
	type: 'collection',
	placeholder: 'Add Option',
	default: {},
	options: [
		{
			displayName: 'Additional Body Parameters',
			name: 'additionalBody',
			type: 'json',
			default: '{}',
			description:
				'Any extra JSON fields to merge into the request body, for parameters not exposed here. Applied last, so it can override the fields above.',
		},
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
			description:
				'Upper bound on generated tokens. Leave at 0 to let the model decide. With the Responses API, pass "max_completion_tokens" through Additional Body Parameters instead.',
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
			displayName: 'Stop Sequences',
			name: 'stopSequences',
			type: 'string',
			default: '',
			description:
				'Sequences that stop generation. Separate multiple sequences with newlines or commas.',
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
		{
			displayName: 'Use Responses API',
			name: 'useResponsesApi',
			type: 'boolean',
			default: false,
			description:
				'Whether to call /v1/responses instead of /v1/chat/completions. Required by some reasoning models.',
		},
	],
};

/**
 * Charm Hyper as a language model for n8n's AI Agent and other sub-node consumers.
 *
 * Hyper speaks the OpenAI wire format, so this delegates to the AI Node SDK's
 * OpenAI client rather than reimplementing transport, streaming or tool calling.
 * That client is wired up by n8n with its tracing, proxy and retry handling.
 */
export class CharmHyperChatModel implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Charm Hyper Chat Model',
		name: 'charmHyperChatModel',
		icon: {
			light: 'file:../../icons/charmHyper.svg',
			dark: 'file:../../icons/charmHyper.dark.svg',
		},
		group: ['transform'],
		version: [1],
		subtitle: '={{$parameter["model"]}}',
		description: 'Charm Hyper chat model to use with an AI Agent or chain',
		defaults: {
			name: 'Charm Hyper Chat Model',
		},
		codex: {
			categories: ['assistant'],
			subcategories: {
				AI: ['Language Models', 'Root Nodes'],
				'Language Models': ['Chat Models (Recommended)'],
			},
			resources: {
				primaryDocumentation: [
					{
						url: 'https://hyper.charm.land/docs/',
					},
				],
			},
		},

		inputs: [],

		outputs: [NodeConnectionTypes.AiLanguageModel],
		outputNames: ['Model'],
		credentials: [
			{
				name: 'charmHyperApi',
				required: true,
			},
		],
		properties: [modelField, optionsCollection],
	};

	methods = {
		loadOptions: {
			getModels,
		},
	};

	async supplyData(this: ISupplyDataFunctions, itemIndex: number): Promise<SupplyData> {
		const credentials = await this.getCredentials('charmHyperApi');
		const modelName = this.getNodeParameter('model', itemIndex) as string;
		const options = this.getNodeParameter('options', itemIndex, {}) as ModelOptions;

		const additionalParams = parseJsonField(
			options.additionalBody,
			'Additional Body Parameters',
			this.getNode(),
			itemIndex,
		);

		return supplyModel(this, {
			type: 'openai',
			baseUrl: (credentials.baseUrl as string) || DEFAULT_BASE_URL,
			apiKey: credentials.apiKey as string,
			model: modelName,
			temperature: options.temperature,
			// A limit of 0 is the UI's "unset"; sending 0 would request zero tokens.
			maxTokens: options.maxOutputTokens === 0 ? undefined : options.maxOutputTokens,
			topP: options.topP,
			frequencyPenalty: options.frequencyPenalty,
			presencePenalty: options.presencePenalty,
			stopSequences: parseStopSequences(options.stopSequences),
			useResponsesApi: options.useResponsesApi,
			additionalParams: Object.keys(additionalParams).length > 0 ? additionalParams : undefined,
		});
	}
}
