import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INode,
	INodePropertyOptions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

export const DEFAULT_BASE_URL = 'https://hyper.charm.land/v1';

export type HyperContext = IExecuteFunctions | ILoadOptionsFunctions;

export interface HyperRequestOptions {
	method: IHttpRequestMethods;
	/** Path appended to the configured base URL, e.g. `/chat/completions`. */
	endpoint: string;
	body?: IDataObject;
	qs?: IDataObject;
	/** Send the request with the Charm Hyper API credential. Defaults to true. */
	authenticated?: boolean;
	itemIndex?: number;
}

/**
 * Resolve the Hyper base URL. Falls back to the public default so that
 * unauthenticated endpoints (the model catalogue) keep working before the
 * user has attached a credential.
 */
async function resolveBaseUrl(context: HyperContext): Promise<string> {
	let baseUrl = DEFAULT_BASE_URL;

	try {
		const credentials = await context.getCredentials<{ baseUrl?: string }>('charmHyperApi');
		if (typeof credentials.baseUrl === 'string' && credentials.baseUrl.trim() !== '') {
			baseUrl = credentials.baseUrl.trim();
		}
	} catch {
		// No credential attached; public endpoints only.
	}

	return baseUrl.replace(/\/+$/, '');
}

export async function hyperApiRequest(
	this: HyperContext,
	{ method, endpoint, body, qs, authenticated = true, itemIndex }: HyperRequestOptions,
): Promise<IDataObject> {
	const baseUrl = await resolveBaseUrl(this);

	const options: IHttpRequestOptions = {
		method,
		url: `${baseUrl}${endpoint}`,
		json: true,
	};

	if (body && Object.keys(body).length > 0) {
		options.body = body;
	}
	if (qs && Object.keys(qs).length > 0) {
		options.qs = qs;
	}

	try {
		if (authenticated) {
			return (await this.helpers.httpRequestWithAuthentication.call(
				this,
				'charmHyperApi',
				options,
			)) as IDataObject;
		}
		return (await this.helpers.httpRequest(options)) as IDataObject;
	} catch (error) {
		// NodeApiError re-wraps an existing NodeApiError by returning it unchanged, so this is safe.
		throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
	}
}

/** Parse a JSON parameter into an object, tolerating empty values. */
export function parseJsonField(
	value: unknown,
	fieldName: string,
	node: INode,
	itemIndex: number,
): IDataObject {
	if (value === undefined || value === null || value === '' || value === '{}') {
		return {};
	}

	if (typeof value === 'object' && !Array.isArray(value)) {
		return value as IDataObject;
	}

	if (typeof value === 'string') {
		try {
			const parsed: unknown = JSON.parse(value);
			if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
				return parsed as IDataObject;
			}
		} catch {
			// Fall through to the shared error below.
		}
	}

	throw new NodeOperationError(node, `"${fieldName}" must be a valid JSON object`, { itemIndex });
}

/** Add a value to a request body unless the user left it unset. */
export function setIfDefined(target: IDataObject, key: string, value: unknown): void {
	if (value !== undefined && value !== null && value !== '') {
		(target as Record<string, unknown>)[key] = value;
	}
}

/** Turn newline/comma separated text into the array form the APIs expect. */
export function parseStopSequences(value: unknown): string[] | undefined {
	if (typeof value !== 'string' || value.trim() === '') {
		return undefined;
	}

	const sequences = value
		.split(/\r?\n|,/)
		.map((entry) => entry.trim())
		.filter((entry) => entry !== '');

	return sequences.length > 0 ? sequences : undefined;
}

export interface MessageEntry {
	role: string;
	content: string;
}

/** Materialise a fixedCollection of messages, validating that it is not empty. */
export function buildMessages(
	parameterValue: unknown,
	fieldName: string,
	node: INode,
	itemIndex: number,
): IDataObject[] {
	const entries = (parameterValue as { values?: MessageEntry[] } | undefined)?.values ?? [];

	if (entries.length === 0) {
		throw new NodeOperationError(node, `At least one message is required in "${fieldName}"`, {
			itemIndex,
		});
	}

	return entries.map((entry) => ({ role: entry.role, content: entry.content }));
}

/** Populate the model dropdown from the public `/models` endpoint. */
export async function getModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
	const response = await hyperApiRequest.call(this, {
		method: 'GET',
		endpoint: '/models',
		authenticated: false,
	});

	const models = (response.data as Array<{ id?: string; display_name?: string }> | undefined) ?? [];

	const options: INodePropertyOptions[] = [];
	for (const model of models) {
		if (typeof model.id !== 'string' || model.id === '') {
			continue;
		}
		options.push({
			name: model.display_name ? `${model.display_name} (${model.id})` : model.id,
			value: model.id,
		});
	}

	return options;
}
