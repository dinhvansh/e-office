const axios = require('axios');

const API_URL = 'http://localhost:4000/api/v1';

// Test credentials
const TEST_USER = {
  email: 'admin@acme.local',
  password: 'admin123'
};

let authToken = '';

async function login() {
  console.log('🔐 Logging in...');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, TEST_USER);
    authToken = response.data.data.tokens.accessToken;
    console.log('✅ Login successful');
    return response.data;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getNotifications() {
  console.log('\n📋 Fetching notifications...');
  console.log('Token:', authToken ? authToken.substring(0, 20) + '...' : 'MISSING');
  try {
    const response = await axios.get(`${API_URL}/notifications`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Notifications:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch notifications:', error.response?.data || error.message);
    throw error;
  }
}

async function getUnreadCount() {
  console.log('\n🔔 Fetching unread count...');
  try {
    const response = await axios.get(`${API_URL}/notifications/unread-count`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    console.log('✅ Unread count:', response.data.count);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch unread count:', error.response?.data || error.message);
    throw error;
  }
}

async function markAsRead(notificationId) {
  console.log(`\n✓ Marking notification ${notificationId} as read...`);
  try {
    const response = await axios.patch(
      `${API_URL}/notifications/${notificationId}/read`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Marked as read:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to mark as read:', error.response?.data || error.message);
    throw error;
  }
}

async function markAllAsRead() {
  console.log('\n✓✓ Marking all notifications as read...');
  try {
    const response = await axios.patch(
      `${API_URL}/notifications/read-all`,
      {},
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ All marked as read:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to mark all as read:', error.response?.data || error.message);
    throw error;
  }
}

async function deleteNotification(notificationId) {
  console.log(`\n🗑️  Deleting notification ${notificationId}...`);
  try {
    const response = await axios.delete(
      `${API_URL}/notifications/${notificationId}`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    console.log('✅ Deleted:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Failed to delete:', error.response?.data || error.message);
    throw error;
  }
}

async function runTests() {
  try {
    // Login
    await login();

    // Get notifications
    const notificationsData = await getNotifications();

    // Get unread count
    await getUnreadCount();

    // If there are notifications, test mark as read
    if (notificationsData.notifications && notificationsData.notifications.length > 0) {
      const firstNotification = notificationsData.notifications[0];
      
      if (!firstNotification.is_read) {
        await markAsRead(firstNotification.id);
        await getUnreadCount();
      }

      // Test mark all as read
      await markAllAsRead();
      await getUnreadCount();

      // Test delete (optional - uncomment if you want to test)
      // await deleteNotification(firstNotification.id);
      // await getNotifications();
    }

    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Tests failed:', error.message);
    process.exit(1);
  }
}

runTests();
