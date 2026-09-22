import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import {
	buildMessages,
	hyperApiRequest,
	parseJsonField,
	parseStopSequences,
	setIfDefined,
} from '../shared/GenericFunctions';

interface CommonOptions {
	additionalBody?: string | IDataObject;
	temperature?: number;
	topP?: number;
}

interface ChatOptions extends CommonOptions {
	frequencyPenalty?: number;
	maxOutputTokens?: number;
	presencePenalty?: number;
	responseFormat?: string;
	stopSequences?: string;
}

interface ResponseOptions extends CommonOptions {
	maxOutputTokens?: number;
}

interface MessageOptions extends CommonOptions {
	stopSequences?: string;
	topK?: number;
}

function emptyInput(node: INode, itemIndex: number, fieldName: string): never {
	throw new NodeOperationError(node, `"${fieldName}" must not be empty`, { itemIndex });
}

/** Merge user-supplied JSON last so it can override the exposed fields. */
function withAdditionalBody(
	body: IDataObject,
	additionalBody: unknown,
	node: INode,
	itemIndex: number,
): IDataObject {
	return Object.assign(
		body,
		parseJsonField(additionalBody, 'Additional Body Parameters', node, itemIndex),
	);
}

export async function executeChat(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const node = this.getNode();
	const model = this.getNodeParameter('model', itemIndex) as string;
	const messages = buildMessages(
		this.getNodeParameter('messages', itemIndex, {}),
		'Messages',
		node,
		itemIndex,
	);
	const options = this.getNodeParameter('options', itemIndex, {}) as ChatOptions;

	const body: IDataObject = { model, messages };

	setIfDefined(body, 'frequency_penalty', options.frequencyPenalty);
	setIfDefined(body, 'presence_penalty', options.presencePenalty);
	setIfDefined(body, 'temperature', options.temperature);
	setIfDefined(body, 'top_p', options.topP);

	if (typeof options.maxOutputTokens === 'number' && options.maxOutputTokens > 0) {
		body.max_tokens = options.maxOutputTokens;
	}

	if (typeof options.responseFormat === 'string' && options.responseFormat !== 'text') {
		body.response_format = { type: options.responseFormat };
	}

	const stop = parseStopSequences(options.stopSequences);
	if (stop !== undefined) {
		body.stop = stop;
	}

	return hyperApiRequest.call(this, {
		method: 'POST',
		endpoint: '/chat/completions',
		body: withAdditionalBody(body, options.additionalBody, node, itemIndex),
		itemIndex,
	});
}

export async function executeResponse(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const node = this.getNode();
	const model = this.getNodeParameter('model', itemIndex) as string;
	const inputType = this.getNodeParameter('inputType', itemIndex, 'text') as string;
	const instructions = this.getNodeParameter('instructions', itemIndex, '') as string;
	const options = this.getNodeParameter('options', itemIndex, {}) as ResponseOptions;

	const body: IDataObject = { model };

	if (inputType === 'messages') {
		body.input = buildMessages(
			this.getNodeParameter('messages', itemIndex, {}),
			'Messages',
			node,
			itemIndex,
		);
	} else {
		const input = this.getNodeParameter('input', itemIndex, '') as string;
		if (typeof input !== 'string' || input.trim() === '') {
			emptyInput(node, itemIndex, 'Input');
		}
		body.input = input;
	}

	if (typeof instructions === 'string' && instructions.trim() !== '') {
		body.instructions = instructions;
	}

	setIfDefined(body, 'temperature', options.temperature);
	setIfDefined(body, 'top_p', options.topP);

	if (typeof options.maxOutputTokens === 'number' && options.maxOutputTokens > 0) {
		body.max_output_tokens = options.maxOutputTokens;
	}

	return hyperApiRequest.call(this, {
		method: 'POST',
		endpoint: '/responses',
		body: withAdditionalBody(body, options.additionalBody, node, itemIndex),
		itemIndex,
	});
}

export async function executeMessage(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	const node = this.getNode();
	const model = this.getNodeParameter('model', itemIndex) as string;
	const maxTokens = this.getNodeParameter('maxTokens', itemIndex, 1024) as number;
	const system = this.getNodeParameter('system', itemIndex, '') as string;
	const messages = buildMessages(
		this.getNodeParameter('messages', itemIndex, {}),
		'Messages',
		node,
		itemIndex,
	);
	const options = this.getNodeParameter('options', itemIndex, {}) as MessageOptions;

	const body: IDataObject = { model, max_tokens: maxTokens, messages };

	if (typeof system === 'string' && system.trim() !== '') {
		body.system = system;
	}

	setIfDefined(body, 'temperature', options.temperature);
	setIfDefined(body, 'top_p', options.topP);

	if (typeof options.topK === 'number' && options.topK > 0) {
		body.top_k = options.topK;
	}

	const stop = parseStopSequences(options.stopSequences);
	if (stop !== undefined) {
		body.stop_sequences = stop;
	}

	return hyperApiRequest.call(this, {
		method: 'POST',
		endpoint: '/messages',
		body: withAdditionalBody(body, options.additionalBody, node, itemIndex),
		itemIndex,
	});
}

export async function executeModel(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	return hyperApiRequest.call(this, {
		method: 'GET',
		endpoint: '/models',
		authenticated: false,
		itemIndex,
	});
}

export async function executeCredit(
	this: IExecuteFunctions,
	itemIndex: number,
): Promise<IDataObject> {
	return hyperApiRequest.call(this, {
		method: 'GET',
		endpoint: '/credits',
		itemIndex,
	});
}
