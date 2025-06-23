import { CacheService, DatabaseService, SchedulerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { fetchAndSaveCosts } from '../tasks/fetchAndSaveCosts';
import { RouterOptions } from './types';

/**
 * Responsible for scheduling and executing cost data fetching tasks
 */
export class CostFetchTaskScheduler {
  private readonly scheduler: SchedulerService;
  private readonly logger: Logger;
  private readonly config: Config;
  private readonly database: DatabaseService;
  private readonly cache: CacheService;

  constructor(options: {
    scheduler: SchedulerService;
    logger: Logger;
    config: Config;
    database: DatabaseService;
    cache: CacheService;
  }) {
    this.scheduler = options.scheduler;
    this.logger = options.logger;
    this.config = options.config;
    this.database = options.database;
    this.cache = options.cache;
  }

  /**
   * Initialize and schedule the tasks
   */
  async initialize() {
    const autoloadConfig = this.config.getOptionalConfig('backend.infraWallet.autoload');
    const autoloadEnabled = autoloadConfig?.getOptionalBoolean('enabled') ?? false;

    if (!autoloadEnabled) {
      this.logger.info('Autoload cost data is disabled, skipping task scheduling');
      return;
    }

    const schedule = autoloadConfig?.getOptionalString('schedule') ?? '0 */8 * * *'; // Default: every 8 hours
    const initialDelayMinutes = autoloadConfig?.getOptionalNumber('initialDelayMinutes') ?? 5; // Default: 5 minutes

    this.logger.info(
      `Configuring cost data fetch task with schedule "${schedule}" and initial delay of ${initialDelayMinutes} minutes`,
    );

    const fetchCostsTask = async () => {
      this.logger.info('Starting scheduled cost data fetch task');

      try {
        const routerOptions: RouterOptions = {
          logger: this.logger,
          config: this.config,
          scheduler: this.scheduler,
          cache: this.cache,
          database: this.database,
        };

        await fetchAndSaveCosts(routerOptions);

        this.logger.info('Completed scheduled cost data fetch task');
      } catch (error: any) {
        this.logger.error(`Failed to fetch cost data: ${error.message}`, { error });
        throw error;
      }
    };

    await this.scheduler.scheduleTask({
      id: 'infrawallet-autoload-costs',
      frequency: { cron: schedule },
      timeout: { hours: 1 },
      initialDelay: { minutes: initialDelayMinutes },
      fn: fetchCostsTask,
    });

    this.logger.info(
      `Scheduled cost data fetch task (runs with schedule: ${schedule}, initial delay: ${initialDelayMinutes} minutes)`,
    );
  }
}
