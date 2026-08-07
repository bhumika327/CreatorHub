import axios from 'axios';

export class LocationService {
  public static async resolveLocation(ip: string): Promise<{ city: string; country: string }> {
    try {
      // Loopback/Local IP check
      if (
        !ip ||
        ip === '127.0.0.1' ||
        ip === '::1' ||
        ip === '::ffff:127.0.0.1' ||
        ip.startsWith('10.') ||
        ip.startsWith('192.168.')
      ) {
        return { city: 'Localhost', country: 'Localhost' };
      }

      // Fetch location via ipapi.co JSON API
      const response = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000 // 5 seconds timeout
      });

      if (response.data && !response.data.error) {
        return {
          city: response.data.city || 'Unknown',
          country: response.data.country_name || 'Unknown'
        };
      }

      return { city: 'Unknown', country: 'Unknown' };
    } catch (error) {
      console.error('[LocationService] Error resolving location for IP:', ip, (error as any).message);
      return { city: 'Unknown', country: 'Unknown' };
    }
  }
}
