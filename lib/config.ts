/** 作息与统计规则。调整这里即可，不用改其他代码。 */

/** 上班时间 */
export const WORK_START = '08:30'
/** 下班时间 */
export const WORK_END = '19:00'
/** 休息时段，不计入工时 */
export const BREAKS: ReadonlyArray<readonly [string, string]> = [
  ['12:00', '14:00'],
  ['18:00', '18:30'],
]
/** 每个工作日的标准工时（小时） */
export const STANDARD_HOURS = 8
/** 早于上班时间打卡的部分是否计入工时 */
export const COUNT_EARLY = false
/** 晚于下班时间的部分（加班）是否计入工时 */
export const COUNT_OVERTIME = true
/** 调休补班日（周末上班）是否计入当月应出勤 */
export const COUNT_MAKEUP_DAYS = true
