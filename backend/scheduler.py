from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app import calculate_daily_referral_commissions, calculate_daily_roi_earnings
import logging
from datetime import datetime
import pytz

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('investment_scheduler')

def log_job_execution(job_name):
    """Decorator to log job execution"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            logger.info(f"\n=== Starting {job_name} at {datetime.utcnow()} ===")
            try:
                result = func(*args, **kwargs)
                logger.info(f"=== Completed {job_name} successfully at {datetime.utcnow()} ===\n")
                return result
            except Exception as e:
                logger.error(f"Error in {job_name}: {str(e)}")
                raise
        return wrapper
    return decorator

@log_job_execution("Daily ROI Calculation")
def run_daily_roi():
    """Run daily ROI calculation and then trigger commission calculation"""
    try:
        # First calculate ROI
        roi_success = calculate_daily_roi_earnings()
        
        # If ROI calculation was successful, run commission calculation
        if roi_success:
            logger.info("ROI calculation successful, now running commission calculation...")
            run_daily_commission()
        else:
            logger.error("ROI calculation failed, skipping commission calculation")
    except Exception as e:
        logger.error(f"Error in run_daily_roi: {str(e)}")
        raise

@log_job_execution("Daily Commission Calculation")
def run_daily_commission():
    calculate_daily_referral_commissions()

def start_scheduler():
    """Initialize and start the APScheduler for daily tasks"""
    try:
        # Use EAT timezone for development testing
        scheduler = BackgroundScheduler(timezone=pytz.timezone('Africa/Nairobi'))
        logger.info(f"Scheduler timezone set to: {scheduler.timezone}")
        
        # Get current time in EAT
        eat_time = datetime.now(pytz.timezone('Africa/Nairobi'))
        logger.info(f"Current time in EAT: {eat_time}")
        
        # Schedule only the ROI job - it will trigger the commission job after completion
        scheduler.add_job(
            run_daily_roi,
            trigger=CronTrigger(
                hour=00,
                minute=00,
                day_of_week='mon-fri',
                timezone=pytz.timezone('Africa/Nairobi')
            ),
            id='daily_roi',
            name='Daily ROI and Commission Calculation',
            replace_existing=True,
            misfire_grace_time=3600  # Allow job to run up to 1 hour late
        )
        
        # Start the scheduler if not already running
        if scheduler.state == 0:
            scheduler.start()
            logger.info(f"Scheduler started successfully at {eat_time}")
            logger.info("\nNext scheduled run times (EAT):")
            for job in scheduler.get_jobs():
                next_run = job.next_run_time.astimezone(pytz.timezone('Africa/Nairobi'))
                logger.info(f"{job.name}: {next_run.strftime('%Y-%m-%d %H:%M:%S %Z')}")
        else:
            logger.info("Scheduler already running")
        
        return scheduler
    except Exception as e:
        logger.error(f"Error starting scheduler: {str(e)}")
        raise
