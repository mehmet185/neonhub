export default async function handler(req, res) {
  // CORS ayarları
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const steamId = req.query.steamid;
  if (!steamId) {
    return res.status(400).json({ error: 'Steam ID gerekli' });
  }
  
  try {
    // Steam XML endpoint (API key gerektirmez!)
    const url = `https://steamcommunity.com/profiles/${steamId}/games?tab=all&xml=1`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return res.status(404).json({ 
        error: 'Profil bulunamadı veya gizli. Steam ayarlarından "Oyun detayları: Herkese Açık" yap.' 
      });
    }
    
    const xml = await response.text();
    
    // XML'den oyun bilgilerini çıkar (basit parser)
    const games = [];
    const gameRegex = /<game>([\s\S]*?)<\/game>/g;
    let match;
    
    while ((match = gameRegex.exec(xml)) !== null) {
      const gameXml = match[1];
      const appId = gameXml.match(/<appID>(\d+)<\/appID>/)?.[1];
      const name = gameXml.match(/<name><!\[CDATA\[(.*?)\]\]><\/name>|<name>(.*?)<\/name>/)?.[1] || gameXml.match(/<name>(.*?)<\/name>/)?.[1];
      const logo = gameXml.match(/<logo><!\[CDATA\[(.*?)\]\]><\/logo>|<logo>(.*?)<\/logo>/)?.[1] || gameXml.match(/<logo>(.*?)<\/logo>/)?.[1];
      const hours = gameXml.match(/<hoursOnRecord>([\d.]+)<\/hoursOnRecord>/)?.[1];
      
      if (appId && name) {
        games.push({
          appid: parseInt(appId),
          name: name,
          img: logo || `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/header.jpg`,
          playtime: hours ? parseFloat(hours) : 0
        });
      }
    }
    
    // Profil bilgileri
    const steamID = xml.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>|<steamID>(.*?)<\/steamID>/)?.[1];
    
    return res.status(200).json({
      games: games,
      player: { persona: steamID || steamId }
    });
    
  } catch (error) {
    return res.status(500).json({ error: 'Steam bağlantısı başarısız: ' + error.message });
  }
}