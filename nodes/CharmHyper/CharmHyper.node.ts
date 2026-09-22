import type {
	IDataObject,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError, NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';
import {
	executeChat,
	executeCredit,
	executeMessage,
	executeModel,
	executeResponse,
} from './actions';
import {
	chatDescription,
	creditDescription,
	messageDescription,
	modelDescription,
	responseDescription,
} from './descriptions';
import { getModels } from '../shared/GenericFunctions';

async function runResource(
	this: IExecuteFunctions,
	resource: string,
	itemIndex: number,
): Promise<IDataObject> {
	switch (resource) {
		case 'chat':
			return executeChat.call(this, itemIndex);
		case 'response':
			return executeResponse.call(this, itemIndex);
		case 'message':
			return executeMessage.call(this, itemIndex);
		case 'model':
			return executeModel.call(this, itemIndex);
		case 'credit':
			return executeCredit.call(this, itemIndex);
		default:
			throw new NodeOperationError(this.getNode(), `Unknown resource "${resource}"`, {
				itemIndex,
			});
	}
}

export class CharmHyper implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Charm Hyper',
		name: 'charmHyper',
		icon: {
			light: 'file:../../icons/charmHyper.svg',
			dark: 'file:../../icons/charmHyper.dark.svg',
		},
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Run inference and read credit balance on the Charm Hyper API',
		defaults: {
			name: 'Charm Hyper',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'charmHyperApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Chat Completion', value: 'chat' },
					{ name: 'Credit Balance', value: 'credit' },
					{ name: 'Message (Anthropic)', value: 'message' },
					{ name: 'Model', value: 'model' },
					{ name: 'Response (OpenAI)', value: 'response' },
				],
				default: 'chat',
			},
			...chatDescription,
			...responseDescription,
			...messageDescription,
			...modelDescription,
			...creditDescription,
		],
	};

	methods = {
		loadOptions: {
			getModels,
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const resource = this.getNodeParameter('resource', itemIndex) as string;
				const response = await runResource.call(this, resource, itemIndex);
				returnData.push({ json: response, pairedItem: itemIndex });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: itemIndex,
					});
					continue;
				}

				if (error instanceof NodeOperationError) {
					throw new NodeOperationError(this.getNode(), error, { itemIndex });
				}

				throw new NodeApiError(this.getNode(), error as JsonObject, { itemIndex });
			}
		}

		return [returnData];
	}
}
