import { createMockBEEF } from '../test/helpers.js';
import UHRPTopicManager from '../UHRPTopicManager.js';

describe('UHRPTopicManager', () => {
  let topicManager: UHRPTopicManager;

  beforeEach(() => {
    topicManager = new UHRPTopicManager();
  });

  test('should admit valid outputs', async () => {
    const validBEEF = await createMockBEEF();
    const result = await topicManager.identifyAdmissibleOutputs(validBEEF, []);
    expect(result.outputsToAdmit.length).toBe(1);
  });

  test('should NOT admit outputs with invalid Protocol Address', async () => {
    const invalidBEEF = await createMockBEEF({ protocolAddress: '1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hg' });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid SHA', async () => {
    const invalidBEEF = await createMockBEEF({
      fileHash: 'invalidHashValue1234567890',
    });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with empty name', async () => {
    const invalidBEEF = await createMockBEEF({ name: '' });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid satoshis', async () => {
    const invalidBEEF = await createMockBEEF({ satoshis: -50 });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with missing public key', async () => {
    const invalidBEEF = await createMockBEEF({ publicKey: '' });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid public key format', async () => {
    const invalidBEEF = await createMockBEEF({ publicKey: 'invalidPublicKey123' });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid file size', async () => {
    const invalidBEEF = await createMockBEEF({ size: -1024 });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with expired expiry time', async () => {
    const invalidBEEF = await createMockBEEF({ expiryTime: Date.now() - 1000 });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid expiry time format', async () => {
    const invalidBEEF = await createMockBEEF({ expiryTime: NaN });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid cover image hash', async () => {
    const invalidBEEF = await createMockBEEF({
      coverHash: 'invalidHashValue1234567890',
    });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid file URL', async () => {
    const invalidBEEF = await createMockBEEF({
      fileURL: '',
    });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });

  test('should NOT admit outputs with invalid cover image URL', async () => {
    const invalidBEEF = await createMockBEEF({
      coverURL: '',
    });
    const result = await topicManager.identifyAdmissibleOutputs(invalidBEEF, []);
    expect(result.outputsToAdmit.length).toBe(0);
  });
});
