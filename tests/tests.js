QUnit.module('EmmaUnifiedIntelligence', function() {
  QUnit.test('should instantiate without errors', function(assert) {
    const intelligence = new EmmaUnifiedIntelligence();
    assert.ok(intelligence instanceof EmmaUnifiedIntelligence, 'Instance created');
  });

  QUnit.test('analyzeAndRespond should return a fallback response on error', async function(assert) {
    const intelligence = new EmmaUnifiedIntelligence({
      vaultAccess: () => { throw new Error('Test error'); }
    });
    const response = await intelligence.analyzeAndRespond('test message', {});
    assert.equal(response.text, "I'm having a little trouble thinking right now, but I'm still here to listen.", 'Fallback response returned');
  });

  QUnit.test('isAddMemoryDetail should return true for valid input', function(assert) {
    const intelligence = new EmmaUnifiedIntelligence();
    intelligence.currentContext.activeMemoryDiscussion = { id: 'mem1' };
    assert.ok(intelligence.isAddMemoryDetail('add to that'), 'Handles "add to that"');
    assert.ok(intelligence.isAddMemoryDetail('add more to that'), 'Handles "add more to that"');
    intelligence.currentContext.activeMemoryDiscussion = null;
    assert.notOk(intelligence.isAddMemoryDetail('add to that'), 'Returns false when no active memory');
  });

  QUnit.module('Heuristic Intent Analysis', function() {
    QUnit.test('should identify vault_query intent', function(assert) {
      const intelligence = new EmmaUnifiedIntelligence();
      const vaultContext = { peopleNames: ['John'] };
      const analysis = intelligence.heuristicAnalyzeIntent('who is John', vaultContext);
      assert.equal(analysis.intent, 'vault_query', 'Correctly identifies vault_query');
      assert.equal(analysis.targetPerson, 'John', 'Correctly identifies target person');
    });

    QUnit.test('should identify photo_request intent', function(assert) {
      const intelligence = new EmmaUnifiedIntelligence();
      intelligence.currentContext.lastQueriedPerson = 'Jane';
      const analysis = intelligence.heuristicAnalyzeIntent('add a photo', {});
      assert.equal(analysis.intent, 'photo_request', 'Correctly identifies photo_request');
      assert.equal(analysis.targetPerson, 'Jane', 'Correctly identifies target person');
    });

    QUnit.test('should identify memory_sharing intent', function(assert) {
      const intelligence = new EmmaUnifiedIntelligence();
      intelligence.currentContext.lastQueriedPerson = 'Jane';
      const analysis = intelligence.heuristicAnalyzeIntent('we went to the park', {});
      assert.equal(analysis.intent, 'memory_sharing', 'Correctly identifies memory_sharing');
      assert.equal(analysis.targetPerson, 'Jane', 'Correctly identifies target person');
    });

    QUnit.test('should identify add_memory_detail intent', function(assert) {
      const intelligence = new EmmaUnifiedIntelligence();
      intelligence.currentContext.activeMemoryDiscussion = { id: 'mem1' };
      const analysis = intelligence.heuristicAnalyzeIntent('add more to that', {});
      assert.equal(analysis.intent, 'add_memory_detail', 'Correctly identifies add_memory_detail');
    });
  });
});
