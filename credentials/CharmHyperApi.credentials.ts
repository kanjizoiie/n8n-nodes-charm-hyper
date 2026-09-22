import type {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	Icon,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Credential for the Charm Hyper API.
 * Hyper accepts `Authorization: Bearer <key>` on every authenticated endpoint, and the
 * credential test hits `/v1/credits` because it is the cheapest authenticated endpoint.
 */
export class CharmHyperApi implements ICredentialType {
	name = 'charmHyperApi';

	displayName = 'Charm Hyper API';

	icon: Icon = { light: 'file:../icons/charmHyper.svg', dark: 'file:../icons/charmHyper.dark.svg' };

	documentationUrl = 'https://hyper.charm.land/docs/api/authentication.html';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			description:
				'Hyper API key from the dashboard. Starts with "sk-hyper-". Sent as a Bearer token.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'https://hyper.charm.land/v1',
			description: 'Base URL of the Hyper API. Only change this when using a proxy or gateway.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials?.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl || "https://hyper.charm.land/v1"}}',
			url: '/credits',
			method: 'GET',
		},
	};
}
