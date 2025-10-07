import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

export class Wiza implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Wiza',
		name: 'wiza',
		icon: 'file:wiza.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with Wiza API for contact enrichment',
		defaults: {
			name: 'Wiza',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'wizaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Email Finder',
						value: 'emailFinder',
						description: 'Find verified work and personal email addresses for a contact using their name, company information, or LinkedIn URL',
						action: 'Find verified work and personal email addresses for a contact using their name company information or linked in url',
					},
					{
						name: 'Phone Finder',
						value: 'phoneFinder',
						description: 'Find mobile and direct dial phone numbers for a contact using their name, company information, or LinkedIn URL',
						action: 'Find mobile and direct dial phone numbers for a contact using their name company information or linkedin url',
					},
					{
						name: 'LinkedIn Profile Finder',
						value: 'linkedinFinder',
						description: 'Find a contact\'s LinkedIn profile URL and key details—such as job title, company, and location—using their name, company, or email address',
						action: 'Find contact linkedin profile url and key details such as job title company and location using their name company or email address',
					},
				],
				default: 'emailFinder',
			},
			{
				displayName: 'Input Type',
				name: 'inputType',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
					},
				},
				options: [
					{
						name: 'Email',
						value: 'email',
						description: 'Enrich contact by email address',
						displayOptions: {
							show: {
								operation: ['phoneFinder', 'linkedinFinder'],
							},
						},
					},
					{
						name: 'LinkedIn URL',
						value: 'linkedinUrl',
						description: 'Enrich contact by LinkedIn profile URL',
						displayOptions: {
							show: {
								operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
							},
						},
					},
					{
						name: 'Contact Details',
						value: 'contactDetails',
						description: 'Enrich contact by name and company/domain',
						displayOptions: {
							show: {
								operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
							},
						},
					},
					{
						name: 'All Fields',
						value: 'allFields',
						description: 'Provide multiple pieces of information for best results',
						displayOptions: {
							show: {
								operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
							},
						},
					},
				],
				default: 'contactDetails',
			},
			// Email input
			{
				displayName: 'Email',
				name: 'email',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
						inputType: ['email', 'allFields'],
					},
				},
				default: '',
				placeholder: 'contact@company.com',
				description: 'Email address of the contact (optional when using All Fields)',
			},
			// LinkedIn URL input
			{
				displayName: 'LinkedIn URL',
				name: 'linkedinUrl',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
						inputType: ['linkedinUrl', 'allFields'],
					},
				},
				default: '',
				placeholder: 'https://linkedin.com/in/username',
				description: 'LinkedIn profile URL of the contact (optional when using All Fields)',
			},
			// Contact details inputs
			{
				displayName: 'Full Name',
				name: 'fullName',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
						inputType: ['contactDetails', 'allFields'],
					},
				},
				default: '',
				placeholder: 'John Doe',
				description: 'Full name of the contact (optional when using All Fields)',
			},
			{
				displayName: 'Company / Domain',
				name: 'company',
				type: 'string',
				displayOptions: {
					show: {
						operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
						inputType: ['contactDetails', 'allFields'],
					},
				},
				default: '',
				placeholder: 'Acme Corp or acme.com',
				description: 'Company name or domain where the contact works (optional when using All Fields)',
			},
			// Enrichment level - only show for Enrich Contact operation
			{
				displayName: 'Enrichment Level',
				name: 'enrichmentLevel',
				type: 'options',
				displayOptions: {
					show: {
						operation: ['enrichContact'],
					},
				},
				options: [
					{
						name: 'None',
						value: 'none',
						description: 'No additional enrichment',
					},
					{
						name: 'Partial',
						value: 'partial',
						description: 'Basic contact information',
					},
					{
						name: 'Phone',
						value: 'phone',
						description: 'Include phone number',
					},
					{
						name: 'Full',
						value: 'full',
						description: 'Complete enrichment with all available data',
					},
				],
				default: 'partial',
				description: 'Level of enrichment to perform',
			},
			// Additional options
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				displayOptions: {
					show: {
						operation: ['emailFinder', 'phoneFinder', 'linkedinFinder'],
					},
				},
				options: [
					{
						displayName: 'Email Type',
						name: 'emailType',
						type: 'options',
						options: [
							{
								name: 'Work',
								value: 'work',
							},
							{
								name: 'Personal',
								value: 'personal',
							},
							{
								name: 'Any',
								value: 'any',
							},
						],
						default: 'work',
						description: 'Preferred email type to find',
					},
					{
						displayName: 'Timeout (Seconds)',
						name: 'timeout',
						type: 'number',
						default: 300,
						description: 'Maximum time to wait for enrichment completion',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				const inputType = this.getNodeParameter('inputType', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				// Validate required fields based on inputType
				if (inputType === 'email') {
					const email = this.getNodeParameter('email', i) as string;
					if (!email || email.trim() === '') {
						throw new NodeOperationError(
							this.getNode(),
							'Email is required when using Email input type',
							{ itemIndex: i }
						);
					}
				} else if (inputType === 'linkedinUrl') {
					const linkedinUrl = this.getNodeParameter('linkedinUrl', i) as string;
					if (!linkedinUrl || linkedinUrl.trim() === '') {
						throw new NodeOperationError(
							this.getNode(),
							'LinkedIn URL is required when using LinkedIn URL input type',
							{ itemIndex: i }
						);
					}
				} else if (inputType === 'contactDetails') {
					const fullName = this.getNodeParameter('fullName', i) as string;
					const company = this.getNodeParameter('company', i) as string;

					if (!fullName || fullName.trim() === '') {
						throw new NodeOperationError(
							this.getNode(),
							'Full Name is required when using Contact Details input type',
							{ itemIndex: i }
						);
					}
					if (!company || company.trim() === '') {
						throw new NodeOperationError(
							this.getNode(),
							'Company/Domain is required when using Contact Details input type',
							{ itemIndex: i }
						);
					}
				}

				// Map operations to enrichment levels
				let enrichmentLevel: string;
				if (operation === 'emailFinder') {
					enrichmentLevel = 'partial';
				} else if (operation === 'phoneFinder') {
					enrichmentLevel = 'phone';
				} else if (operation === 'linkedinFinder') {
					enrichmentLevel = 'none';
				} else {
					enrichmentLevel = 'partial';
				}

				if (['emailFinder', 'phoneFinder', 'linkedinFinder'].includes(operation)) {
				// Build individual_reveal object based on input type
				const individualReveal: any = {};

				// Add input data based on type
				if (inputType === 'email') {
					individualReveal.email = this.getNodeParameter('email', i) as string;
				} else if (inputType === 'linkedinUrl') {
					individualReveal.profile_url = this.getNodeParameter('linkedinUrl', i) as string;
				} else if (inputType === 'contactDetails') {
					individualReveal.full_name = this.getNodeParameter('fullName', i) as string;
					individualReveal.company = this.getNodeParameter('company', i) as string;
				} else if (inputType === 'allFields') {
					// Add all provided fields
					const email = this.getNodeParameter('email', i) as string;
					const linkedinUrl = this.getNodeParameter('linkedinUrl', i) as string;
					const fullName = this.getNodeParameter('fullName', i) as string;
					const company = this.getNodeParameter('company', i) as string;

					if (email) individualReveal.email = email;
					if (linkedinUrl) individualReveal.profile_url = linkedinUrl;
					if (fullName) individualReveal.full_name = fullName;
					if (company) individualReveal.company = company;
				}

				// Build request body with correct structure
				const body: any = {
					individual_reveal: individualReveal,
					enrichment_level: enrichmentLevel,
				};

				// Add additional fields
				if (additionalFields.emailType) {
					body.email_type = additionalFields.emailType;
				}

				// Start the enrichment
				const startResponse = await this.helpers.requestWithAuthentication.call(this, 'wizaApi', {
					method: 'POST',
					url: 'https://wiza.co/api/individual_reveals',
					headers: {
						'Accept': 'application/json',
						'Content-Type': 'application/json',
					},
					body,
					json: true,
				});

				const revealId = startResponse.data?.id;
				if (!revealId) {
					throw new NodeOperationError(this.getNode(), `Failed to start enrichment: ${JSON.stringify(startResponse)}`);
				}
				const timeout = (additionalFields.timeout || 300) * 1000; // Convert to ms
				const startTime = Date.now();

				// Custom polling intervals: [0.5, 1, 1, 1.5, 2, 3] seconds
				const pollingCycle = [500, 1000, 1000, 1500, 2000, 3000]; // in milliseconds
				let attemptIndex = 0;

				// Poll for completion
				let isComplete = false;
				let finalResult = null;

				while (!isComplete && Date.now() - startTime < timeout) {
					// Determine wait time based on attempt
					const waitTime = attemptIndex < pollingCycle.length 
						? pollingCycle[attemptIndex] 
						: pollingCycle[pollingCycle.length - 1]; // Use last interval (3s) for remaining attempts
					
					await sleep(waitTime);
					attemptIndex++;

					try {
						const statusResponse = await this.helpers.requestWithAuthentication.call(
							this,
							'wizaApi',
							{
								method: 'GET',
								url: `https://wiza.co/api/individual_reveals/${revealId}`,
								headers: {
									'Accept': 'application/json',
									'Content-Type': 'application/json',
								},
								json: true,
							},
						);

						const revealData = statusResponse.data;
						if (!revealData) {
							throw new NodeOperationError(this.getNode(), `Invalid response format: ${JSON.stringify(statusResponse)}`);
						}

						if (revealData.is_complete === true) {
							isComplete = true;
							finalResult = revealData;
						} else if (revealData.status === 'failed') {
							throw new NodeOperationError(this.getNode(), `Enrichment failed: ${revealData.error || 'Unknown error'}`);
						}
					} catch (error) {
						if (error.statusCode === 404) {
							// Still processing, continue polling
							continue;
						}
						if (error instanceof NodeOperationError) {
							throw error;
						}
						throw new NodeOperationError(this.getNode(), error, {
							itemIndex: i,
						});
					}
				}

				if (!isComplete) {
					throw new NodeOperationError(this.getNode(), `Enrichment timed out after ${timeout / 1000} seconds`);
				}

				returnData.push({
					json: finalResult,
					pairedItem: { item: i },
				});
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: this.getInputData(i)[0].json, error, pairedItem: i });
					continue;
				} else {
					if (error.context) {
						error.context.itemIndex = i;
						throw error;
					}
					throw new NodeOperationError(this.getNode(), error, {
						itemIndex: i,
					});
				}
			}
		}

		return [returnData];
	}
}
