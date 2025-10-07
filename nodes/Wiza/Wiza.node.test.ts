import { Wiza } from './Wiza.node';
import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

describe('Wiza Node', () => {
	let wiza: Wiza;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		wiza = new Wiza();
		mockExecuteFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => ({ name: 'Wiza', type: 'wiza', typeVersion: 1, id: 'test' })),
			continueOnFail: jest.fn(),
			helpers: {
				requestWithAuthentication: jest.fn(),
			},
		} as unknown as IExecuteFunctions;
	});

	describe('continueOnFail error handling', () => {
		it('should throw NodeOperationError when continueOnFail is false and API fails', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: { test: 'data' },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder') // operation
				.mockReturnValueOnce('email') // inputType
				.mockReturnValueOnce({}) // additionalFields
				.mockReturnValueOnce('test@example.com'); // email

			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				new Error('API Error'),
			);

			await expect(wiza.execute.call(mockExecuteFunctions)).rejects.toThrow(NodeOperationError);
		});

		it('should return error in output when continueOnFail is true and API fails', async () => {
			const inputData: INodeExecutionData[] = [
				{
					json: { test: 'data' },
				},
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder') // operation
				.mockReturnValueOnce('email') // inputType
				.mockReturnValueOnce({}) // additionalFields
				.mockReturnValueOnce('test@example.com'); // email

			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			const apiError = new Error('API Error');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock).mockRejectedValue(
				apiError,
			);

			const result = await wiza.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual({ test: 'data' });
			expect(result[0][0].error).toEqual(apiError);
			expect(result[0][0].pairedItem).toBe(0);
		});

		it('should continue processing remaining items when continueOnFail is true', async () => {
			const inputData: INodeExecutionData[] = [
				{ json: { test: 'data1' } },
				{ json: { test: 'data2' } },
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			// First item fails
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('email')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('test1@example.com') // validation
				.mockReturnValueOnce('test1@example.com') // actual use
				// Second item succeeds
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('email')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('test2@example.com') // validation
				.mockReturnValueOnce('test2@example.com'); // actual use

			const apiError = new Error('API Error');
			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock)
				.mockRejectedValueOnce(apiError) // First item fails
				.mockResolvedValueOnce({ data: { id: 'reveal123' } }) // Second item start
				.mockResolvedValueOnce({ data: { id: 'reveal123', is_complete: true, email: 'found@example.com' } }); // Second item result

			const result = await wiza.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(2);

			// First item should have error
			expect(result[0][0].error).toEqual(apiError);
			expect(result[0][0].pairedItem).toBe(0);

			// Second item should have successful result
			expect(result[0][1].json).toHaveProperty('email', 'found@example.com');
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
		});

		it('should maintain proper item pairing in all scenarios', async () => {
			const inputData: INodeExecutionData[] = [
				{ json: { id: 1 } },
				{ json: { id: 2 } },
				{ json: { id: 3 } },
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			// Setup parameters for all items
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder').mockReturnValueOnce('email').mockReturnValueOnce({}).mockReturnValueOnce('test1@example.com').mockReturnValueOnce('test1@example.com')
				.mockReturnValueOnce('emailFinder').mockReturnValueOnce('email').mockReturnValueOnce({}).mockReturnValueOnce('test2@example.com').mockReturnValueOnce('test2@example.com')
				.mockReturnValueOnce('emailFinder').mockReturnValueOnce('email').mockReturnValueOnce({}).mockReturnValueOnce('test3@example.com').mockReturnValueOnce('test3@example.com');

			const error1 = new Error('Error 1');
			const error3 = new Error('Error 3');

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock)
				.mockRejectedValueOnce(error1) // Item 0 fails
				.mockResolvedValueOnce({ data: { id: 'reveal2' } })
				.mockResolvedValueOnce({ data: { id: 'reveal2', is_complete: true, result: 'success2' } }) // Item 1 succeeds
				.mockRejectedValueOnce(error3); // Item 2 fails

			const result = await wiza.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(3);
			expect(result[0][0].pairedItem).toBe(0);
			expect(result[0][1].pairedItem).toEqual({ item: 1 });
			expect(result[0][2].pairedItem).toBe(2);
		});
	});

	describe('input validation', () => {
		it('should throw error when email is empty for email input type', async () => {
			const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('email')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(''); // empty email

			await expect(wiza.execute.call(mockExecuteFunctions)).rejects.toThrow('Email is required when using Email input type');
		});

		it('should throw error when LinkedIn URL is empty for linkedinUrl input type', async () => {
			const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('linkedinUrl')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('   '); // whitespace only

			await expect(wiza.execute.call(mockExecuteFunctions)).rejects.toThrow('LinkedIn URL is required when using LinkedIn URL input type');
		});

		it('should throw error when fullName is empty for contactDetails input type', async () => {
			const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('contactDetails')
				.mockReturnValueOnce({})
				.mockReturnValueOnce(''); // empty fullName

			await expect(wiza.execute.call(mockExecuteFunctions)).rejects.toThrow('Full Name is required when using Contact Details input type');
		});

		it('should throw error when company is empty for contactDetails input type', async () => {
			const inputData: INodeExecutionData[] = [{ json: { test: 'data' } }];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('contactDetails')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('John Doe') // valid fullName
				.mockReturnValueOnce(''); // empty company

			await expect(wiza.execute.call(mockExecuteFunctions)).rejects.toThrow('Company/Domain is required when using Contact Details input type');
		});
	});

	describe('successful execution', () => {
		it('should successfully process email finder operation', async () => {
			const inputData: INodeExecutionData[] = [
				{ json: { test: 'data' } },
			];

			(mockExecuteFunctions.getInputData as jest.Mock).mockReturnValue(inputData);
			(mockExecuteFunctions.getNodeParameter as jest.Mock)
				.mockReturnValueOnce('emailFinder')
				.mockReturnValueOnce('email')
				.mockReturnValueOnce({})
				.mockReturnValueOnce('test@example.com');

			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

			const mockRevealData = {
				id: 'reveal123',
				is_complete: true,
				email: 'found@example.com',
			};

			(mockExecuteFunctions.helpers.requestWithAuthentication as jest.Mock)
				.mockResolvedValueOnce({ data: { id: 'reveal123' } })
				.mockResolvedValueOnce({ data: mockRevealData });

			const result = await wiza.execute.call(mockExecuteFunctions);

			expect(result).toHaveLength(1);
			expect(result[0]).toHaveLength(1);
			expect(result[0][0].json).toEqual(mockRevealData);
			expect(result[0][0].pairedItem).toEqual({ item: 0 });
		});
	});
});
