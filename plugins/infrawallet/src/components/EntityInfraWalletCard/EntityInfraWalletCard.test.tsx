import { Report } from '../../api/types';
import { getChartData, getUniqueProjects } from './EntityInfraWalletCard';

describe('getUniqueProjects', () => {
  it('should return an empty array when costData is null', () => {
    const result = getUniqueProjects(null);
    expect(result).toEqual([]);
  });

  it('should return an empty array when costData is empty', () => {
    const result = getUniqueProjects([]);
    expect(result).toEqual([]);
  });

  it('should return unique projects from costData', () => {
    const costData: Report[] = [
      { id: '1', project: 'Project A', account: 'Account 1', service: '', category: '', provider: '', reports: {} },
      { id: '2', project: 'Project B', account: 'Account 2', service: '', category: '', provider: '', reports: {} },
      { id: '3', project: 'Project A', account: 'Account 3', service: '', category: '', provider: '', reports: {} },
    ];
    const result = getUniqueProjects(costData);
    expect(result).toEqual(['Project A', 'Project B']);
  });

  it('should return unique accounts when project is undefined', () => {
    const costData: Report[] = [
      { id: '1', project: undefined, account: 'Account 1', service: '', category: '', provider: '', reports: {} },
      { id: '2', project: undefined, account: 'Account 2', service: '', category: '', provider: '', reports: {} },
      { id: '3', project: undefined, account: 'Account 1', service: '', category: '', provider: '', reports: {} },
    ];
    const result = getUniqueProjects(costData);
    expect(result).toEqual(['Account 1', 'Account 2']);
  });

  it('should ignore entries where both project and account are undefined', () => {
    const costData: Report[] = [
      { id: '1', project: undefined, account: undefined, service: '', category: '', provider: '', reports: {} },
      { id: '2', project: 'Project A', account: 'Account 2', service: '', category: '', provider: '', reports: {} },
      { id: '3', project: undefined, account: 'Account 1', service: '', category: '', provider: '', reports: {} },
    ];
    const result = getUniqueProjects(costData);
    expect(result).toEqual(['Project A', 'Account 1']);
  });

  it('should handle a mix of projects and accounts', () => {
    const costData: Report[] = [
      { id: '1', project: 'Project A', account: 'Account 1', service: '', category: '', provider: '', reports: {} },
      { id: '2', project: undefined, account: 'Account 2', service: '', category: '', provider: '', reports: {} },
      { id: '3', project: 'Project B', account: 'Account 2', service: '', category: '', provider: '', reports: {} },
      { id: '4', project: undefined, account: 'Account 1', service: '', category: '', provider: '', reports: {} },
    ];
    const result = getUniqueProjects(costData);
    expect(result).toEqual(['Project A', 'Account 2', 'Project B', 'Account 1']);
  });
});

describe('getChartData', () => {
  it('should return an 0 for projects when costData is null', () => {
    const result = getChartData(null, ['Project A'], ['2023-01']);
    expect(result).toEqual([{ period: '2023-01', 'Project A': 0 }]);
  });

  it('should return an empty array when sortedPeriods is empty', () => {
    const costData: Report[] = [
      {
        id: '1',
        project: 'Project A',
        account: 'Account 1',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 100 },
      },
    ];
    const result = getChartData(costData, ['Project A'], []);
    expect(result).toEqual([]);
  });

  it('should return chart data for the given projects and periods', () => {
    const costData: Report[] = [
      {
        id: '1',
        project: 'Project A',
        account: 'Account 1',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 100, '2023-02': 200 },
      },
      {
        id: '2',
        project: 'Project B',
        account: 'Account 2',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 150, '2023-02': 250 },
      },
      {
        id: '2',
        project: undefined,
        account: 'Account 3',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 350, '2023-02': 350 },
      },
    ];
    const sortedPeriods = ['2023-01', '2023-02'];
    const projects = ['Project A', 'Project B', 'Account 3'];

    const result = getChartData(costData, projects, sortedPeriods);
    expect(result).toEqual([
      { period: '2023-01', 'Project A': 100, 'Project B': 150, 'Account 3': 350 },
      { period: '2023-02', 'Project A': 200, 'Project B': 250, 'Account 3': 350 },
    ]);
  });

  it('should handle missing data for a project in a specific period', () => {
    const costData: Report[] = [
      {
        id: '1',
        project: 'Project A',
        account: 'Account 1',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 100 },
      },
      {
        id: '2',
        project: 'Project B',
        account: 'Account 2',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-02': 250 },
      },
    ];
    const sortedPeriods = ['2023-01', '2023-02'];
    const projects = ['Project A', 'Project B'];

    const result = getChartData(costData, projects, sortedPeriods);
    expect(result).toEqual([
      { period: '2023-01', 'Project A': 100, 'Project B': 0 },
      { period: '2023-02', 'Project A': 0, 'Project B': 250 },
    ]);
  });

  it('should handle accounts when project is undefined', () => {
    const costData: Report[] = [
      {
        id: '1',
        project: undefined,
        account: 'Account 1',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 100, '2023-02': 200 },
      },
      {
        id: '2',
        project: undefined,
        account: 'Account 2',
        service: '',
        category: '',
        provider: '',
        reports: { '2023-01': 150, '2023-02': 250 },
      },
    ];
    const sortedPeriods = ['2023-01', '2023-02'];
    const projects = ['Account 1', 'Account 2'];

    const result = getChartData(costData, projects, sortedPeriods);
    expect(result).toEqual([
      { period: '2023-01', 'Account 1': 100, 'Account 2': 150 },
      { period: '2023-02', 'Account 1': 200, 'Account 2': 250 },
    ]);
  });
});
