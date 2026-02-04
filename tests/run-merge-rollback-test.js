
// Mock external dependencies
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();
global.localStorage = localStorageMock;

// Mock SheetEditor logic for handleMerge (simplified for testing)
// We will simulate the critical path: State Backup -> Optimistic Update -> API Call -> Error -> Rollback

class MockSheetEditor {
  constructor() {
    this.nestedGridData = [
      ['A', 'B'],
      ['C', 'D']
    ];
    this.nestedGridMerges = [];
    this.apiShouldFail = false;
    this.apiErrorType = 'GENERIC';
  }

  async handleMerge() {
    console.log('--- Starting handleMerge ---');
    
    // 1. Backup State
    const previousGridData = this.nestedGridData.map(r => [...r]);
    const previousGridMerges = [...this.nestedGridMerges];
    console.log('Backup created.');

    try {
      // 2. Optimistic Update (Clear 'B')
      // Simulate merging A and B (Row 0, Col 0-1)
      const newData = this.nestedGridData.map(r => [...r]);
      newData[0][1] = ''; // Clear B
      this.nestedGridData = newData;
      this.nestedGridMerges = [{ startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 2 }];
      console.log('Optimistic update applied:', JSON.stringify(this.nestedGridData));

      // 3. API Call
      await this.mockApiCall();
      
      console.log('API Success. Merge committed.');

    } catch (e) {
      console.error(`API Failed: ${e.message}`);
      
      // 4. Rollback Logic
      console.log('Rolling back state...');
      this.nestedGridData = previousGridData;
      this.nestedGridMerges = previousGridMerges;
      console.log('State rolled back:', JSON.stringify(this.nestedGridData));
    }
  }

  async mockApiCall() {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (this.apiShouldFail) {
          reject(new Error(this.apiErrorType === 'AUTH' ? 'UNAUTHENTICATED' : 'Network Error'));
        } else {
          resolve(true);
        }
      }, 50);
    });
  }
}

// --- Test Runner ---
async function runTests() {
  let passed = 0;
  let failed = 0;

  const assert = (condition, msg) => {
    if (condition) { console.log(`✅ PASS: ${msg}`); passed++; }
    else { console.error(`❌ FAIL: ${msg}`); failed++; }
  };

  // Test 1: Successful Merge
  console.log('\nTest 1: Successful Merge');
  const editor1 = new MockSheetEditor();
  await editor1.handleMerge();
  assert(editor1.nestedGridData[0][1] === '', 'Data should be cleared (merged) on success');

  // Test 2: Failed Merge (Network Error) -> Rollback
  console.log('\nTest 2: Failed Merge (Network Error)');
  const editor2 = new MockSheetEditor();
  editor2.apiShouldFail = true;
  await editor2.handleMerge();
  assert(editor2.nestedGridData[0][1] === 'B', 'Data should be restored on error');

  // Test 3: Failed Merge (Auth Error) -> Rollback
  console.log('\nTest 3: Failed Merge (Auth Error)');
  const editor3 = new MockSheetEditor();
  editor3.apiShouldFail = true;
  editor3.apiErrorType = 'AUTH';
  await editor3.handleMerge();
  assert(editor3.nestedGridData[0][1] === 'B', 'Data should be restored on auth error');

  console.log(`\nTests Completed: ${passed} Passed, ${failed} Failed.`);
}

runTests();
