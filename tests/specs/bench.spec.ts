import { describe, expect, it } from 'vitest';

import { flagOf, spreadOf } from '../../bench/compare.js';

describe('the benchmark comparison', () => {
  it('fails a count that grew by one', () => {
    expect(flagOf('count', [100], [101])).toBe('grew, fails');
    expect(flagOf('count', [100], [100])).toBe('');
    expect(flagOf('count', [100], [99])).toBe('shrank');
    expect(flagOf('count', [0], [1])).toBe('grew, fails');
    expect(flagOf('size', [100], [101])).toBe('grew, review');
  });

  it('leaves the fastest and the slowest quarter of the samples out of a spread', () => {
    expect(spreadOf([5])).toEqual([5, 5]);
    expect(spreadOf([9, 1, 5])).toEqual([1, 9]);
    expect(spreadOf([100, 3, 2, 4, 1])).toEqual([2, 4]);
    expect(spreadOf([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])).toEqual([3, 9]);
  });

  it('flags a time that changed, though a sample of the base ran slow', () => {
    expect(flagOf('time', [100, 101, 102, 103, 180], [120, 121, 122, 123, 124])).toBe('slower, review');
    expect(flagOf('time', [120, 121, 122, 123, 124], [100, 101, 102, 103, 180])).toBe('faster');
  });

  it('flags no time a slow sample alone sets apart', () => {
    expect(flagOf('time', [100, 101, 102, 103, 104], [190, 102, 103, 104, 105])).toBe('');
    expect(flagOf('time', [190, 101, 102, 103, 104], [100, 101, 102, 103, 104])).toBe('');
  });

  it('flags no time whose spreads overlap, however far its median moved', () => {
    expect(flagOf('time', [95, 100, 105, 110, 115], [100, 108, 111, 114, 120])).toBe('');
    expect(flagOf('time', [100, 108, 111, 114, 120], [95, 100, 105, 110, 115])).toBe('');
  });

  it('flags no time that changed by less than the threshold', () => {
    expect(flagOf('time', [100, 100.5, 101, 101.5, 102], [103, 103.5, 104, 104.5, 105])).toBe('');
  });

  it('flags a heap reading beyond its spread, however small its share', () => {
    expect(flagOf('heap', [21342, 21342, 21342, 21342, 21353], [21358, 21358, 21358, 21358, 21369])).toBe('grew, review');
    expect(flagOf('heap', [21358, 21358, 21358, 21358, 21369], [21342, 21342, 21342, 21342, 21353])).toBe('shrank');
    expect(flagOf('heap', [-288, -288, -288, -288, -3216], [816, 816, 816, 816, 816])).toBe('grew, review');
  });

  it('flags no heap reading within its spread', () => {
    expect(flagOf('heap', [-288, -288, -288, -288, -3216], [-288, -288, -288, -288, -288])).toBe('');
    expect(flagOf('heap', [100, 104, 108, 112, 116], [106, 110, 114, 118, 122])).toBe('');
  });
});
