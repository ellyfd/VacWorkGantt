import { base44 } from '@/api/base44Client';

/**
 * 取得管理員和職代的 email 列表
 */
function getNotificationRecipients(employees, employeeId) {
  const emp = employees.find(e => e.id === employeeId);

  const adminEmails = employees
    .filter(e => e.role === 'admin' && e.user_emails?.length > 0)
    .flatMap(e => e.user_emails);

  const deputyEmails = [emp?.deputy_1, emp?.deputy_2]
    .filter(Boolean)
    .flatMap(depId => employees.find(e => e.id === depId)?.user_emails || []);

  return { emp, adminEmails, deputyEmails };
}

/**
 * 發送請假通知
 * @param {Object} params
 * @param {Array} params.employees - 所有員工列表
 * @param {string} params.employeeId - 請假員工ID
 * @param {string} params.date - 請假日期
 * @param {string} params.leaveTypeId - 假別ID
 * @param {Array} params.leaveTypes - 所有假別列表
 * @param {string} params.action - 'create' 或 'delete'
 * @param {Object} params.relatedRecord - 關聯的 LeaveRecord（create 時可選，delete 時必需）
 */
export async function sendLeaveNotification({
  employees,
  employeeId,
  date,
  leaveTypeId,
  leaveTypes,
  action,
  relatedRecord
}) {
  const { emp, adminEmails, deputyEmails } = getNotificationRecipients(employees, employeeId);
  const leaveTypeName = leaveTypes.find(lt => lt.id === leaveTypeId)?.name || '未知假別';
  const verb = action === 'create' ? '新增了' : '取消了';

  const sendNotif = async (email, message) => {
    const oldNotifications = await base44.entities.Notification.filter({
      recipient_email: email,
      message: { $regex: date }
    });
    await Promise.all(oldNotifications.map(n => base44.entities.Notification.delete(n.id)));

    const notifData = {
      recipient_email: email,
      type: 'leave_created',
      message
    };

    if (action === 'create' && relatedRecord?.id) {
      notifData.related_entity_id = relatedRecord.id;
      notifData.related_entity_type = 'LeaveRecord';
    }

    await base44.entities.Notification.create(notifData);
  };

  await Promise.all([
    ...adminEmails.map(email =>
      sendNotif(email, `${emp?.name || '未知員工'} ${verb} ${date} 的 ${leaveTypeName}`)
    ),
    ...deputyEmails.map(email =>
      sendNotif(email, `您的職務代理人 ${emp?.name} ${verb} ${date} 的 ${leaveTypeName}`)
    ),
  ]);
}

/**
 * 發送區間請假取消通知
 * @param {Object} params
 * @param {Array} params.employees - 所有員工列表
 * @param {string} params.employeeId - 請假員工ID
 * @param {Array} params.dates - 取消的日期陣列
 * @param {string} params.leaveTypeId - 假別ID
 * @param {Array} params.leaveTypes - 所有假別列表
 */
export async function sendRangeDeleteNotification({
  employees,
  employeeId,
  dates,
  leaveTypeId,
  leaveTypes
}) {
  const { emp, adminEmails, deputyEmails } = getNotificationRecipients(employees, employeeId);
  const leaveTypeName = leaveTypes.find(lt => lt.id === leaveTypeId)?.name || '未知假別';
  const sortedDates = [...new Set(dates)].sort();

  const msgSuffix = sortedDates.length === 1
    ? `${sortedDates[0]} 的 ${leaveTypeName}`
    : `${sortedDates[0]} 至 ${sortedDates[sortedDates.length - 1]} 共 ${sortedDates.length} 天的 ${leaveTypeName}`;

  const sendNotif = async (email, message) => {
    await base44.entities.Notification.create({
      recipient_email: email,
      type: 'leave_created',
      message,
      related_entity_type: 'LeaveRecord'
    });
  };

  await Promise.all([
    ...adminEmails.map(email =>
      sendNotif(email, `${emp?.name || '未知員工'} 取消了 ${msgSuffix}`)
    ),
    ...deputyEmails.map(email =>
      sendNotif(email, `您的職務代理人 ${emp?.name} 取消了 ${msgSuffix}`)
    ),
  ]);
}
