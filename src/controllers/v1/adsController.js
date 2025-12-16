const dataStore = require('../../models/v1/data');

const categories = [
  'Электроника',
  'Недвижимость',
  'Транспорт',
  'Работа',
  'Услуги',
  'Животные',
  'Мода',
  'Детское'
];

const baseCharacteristics = {
  "Состояние": '',
  "Гарантия": '',
  "Производитель": '',
  "Модель": '',
  "Цвет": ''
};

const getAds = (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      categoryId,
      minPrice,
      maxPrice,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    let filteredAds = [...dataStore.ads];

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      filteredAds = filteredAds.filter(ad => statuses.includes(ad.status));
    }

    if (categoryId) {
      filteredAds = filteredAds.filter(ad => ad.categoryId === parseInt(categoryId));
    }

    if (minPrice) {
      filteredAds = filteredAds.filter(ad => ad.price >= parseFloat(minPrice));
    }

    if (maxPrice) {
      filteredAds = filteredAds.filter(ad => ad.price <= parseFloat(maxPrice));
    }

    if (search) {
      const searchLower = search.toLowerCase();
      filteredAds = filteredAds.filter(ad => 
        ad.title.toLowerCase().includes(searchLower) ||
        ad.description.toLowerCase().includes(searchLower)
      );
    }

    filteredAds.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'price':
          aValue = a.price;
          bValue = b.price;
          break;
        case 'priority':
          aValue = a.priority === 'urgent' ? 1 : 0;
          bValue = b.priority === 'urgent' ? 1 : 0;
          break;
        case 'createdAt':
        default:
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    const total = filteredAds.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAds = filteredAds.slice(startIndex, endIndex);

    res.json({
      ads: paginatedAds,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка при получении объявлений',
      message: error.message
    });
  }
};

const getAdById = (req, res) => {
  try {
    const { id } = req.params;
    const adId = parseInt(id);
    
    const ad = dataStore.ads.find(ad => ad.id === adId);
    
    if (!ad) {
      return res.status(404).json({
        error: 'Объявление не найдено',
        id: adId
      });
    }
    
    res.json(ad);
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка при получении объявления',
      message: error.message
    });
  }
};

const approveAd = (req, res) => {
  try {
    const { id } = req.params;
    const adId = parseInt(id);
    
    const ad = dataStore.ads.find(ad => ad.id === adId);
    
    if (!ad) {
      return res.status(404).json({
        error: 'Объявление не найдено',
        id: adId
      });
    }
    
    const historyEntry = {
      id: ad.moderationHistory.length + 1,
      moderatorId: dataStore.moderator.id,
      moderatorName: dataStore.moderator.name,
      action: 'approved',
      reason: null,
      comment: 'Объявление одобрено модератором',
      timestamp: new Date().toISOString()
    };
    
    ad.moderationHistory.push(historyEntry);
    ad.status = 'approved';
    ad.updatedAt = new Date().toISOString();
    
    res.json({
      message: 'Объявление успешно одобрено',
      ad: ad
    });
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка при одобрении объявления',
      message: error.message
    });
  }
};

const rejectAd = (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        error: 'Необходимо указать причину отклонения'
      });
    }
    
    const adId = parseInt(id);
    const ad = dataStore.ads.find(ad => ad.id === adId);
    
    if (!ad) {
      return res.status(404).json({
        error: 'Объявление не найдено',
        id: adId
      });
    }
    
    const historyEntry = {
      id: ad.moderationHistory.length + 1,
      moderatorId: dataStore.moderator.id,
      moderatorName: dataStore.moderator.name,
      action: 'rejected',
      reason: reason,
      comment: comment || 'Объявление отклонено модератором',
      timestamp: new Date().toISOString()
    };
    
    ad.moderationHistory.push(historyEntry);
    ad.status = 'rejected';
    ad.updatedAt = new Date().toISOString();
    
    res.json({
      message: 'Объявление успешно отклонено',
      ad: ad
    });
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка при отклонении объявления',
      message: error.message
    });
  }
};

const requestChanges = (req, res) => {
  try {
    const { id } = req.params;
    const { reason, comment } = req.body;
    
    if (!reason) {
      return res.status(400).json({
        error: 'Необходимо указать причину запроса изменений'
      });
    }
    
    const adId = parseInt(id);
    const ad = dataStore.ads.find(ad => ad.id === adId);
    
    if (!ad) {
      return res.status(404).json({
        error: 'Объявление не найдено',
        id: adId
      });
    }
    
    const historyEntry = {
      id: ad.moderationHistory.length + 1,
      moderatorId: dataStore.moderator.id,
      moderatorName: dataStore.moderator.name,
      action: 'requestChanges',
      reason: reason,
      comment: comment || 'Требуются изменения в объявлении',
      timestamp: new Date().toISOString()
    };
    
    ad.moderationHistory.push(historyEntry);
    ad.status = 'draft';
    ad.updatedAt = new Date().toISOString();
    
    res.json({
      message: 'Запрос изменений успешно отправлен',
      ad: ad
    });
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка при запросе изменений',
      message: error.message
    });
  }
};

const createAd = (req, res) => {
  try {
    const { title, description, price, category, images, characteristics } = req.body;

    if (!title || !price || category === undefined) {
      return res.status(400).json({
        error: 'Нужно указать заголовок, цену и категорию'
      });
    }

    const parsedPrice = parseFloat(price);
    const parsedCategoryId = categories.indexOf(category);

    if (Number.isNaN(parsedPrice) || parsedCategoryId === -1){
      return res.status(400).json({
        error: 'Некорректные значения цены или категории'
      });
    }

    const now = new Date();
    const nowISO = now.toISOString();

    const maxId = dataStore.ads.reduce((max, ad) => Math.max(max, ad.id), 0);
    const newId = maxId + 1;

    let imageArray = [];

    if (Array.isArray(images)) {
      imageArray = images
        .filter((url) => typeof url === 'string')
        .map((url) => url.trim())
        .filter((url) => url.length > 0);
    }

    while (imageArray.length < 3) {
      imageArray.push(`https://placehold.co/300x200/cccccc/969696?text=Image+${newId}-${imageArray.length + 1}`);
    }

    const parsedCharacteristics = {
      "Состояние": characteristics["Состояние"].trim(),
      "Гарантия": characteristics["Гарантия"].trim(),
      "Производитель": characteristics["Производитель"].trim(),
      "Модель": characteristics["Модель"].trim(),
      "Цвет": characteristics["Цвет"].trim(),
    };


    const newAd = {
      id: newId,
      title: `Объявление ${id}: ` + title,
      description: description || '',
      price: parsedPrice,
      category: category,
      categoryId: parsedCategoryId,
      status: 'pending',
      priority: 'normal',
      createdAt: nowISO,
      updatedAt: nowISO,
      images: imageArray,
      seller: {
        id: dataStore.moderator.id,
        name: dataStore.moderator.name,
        rating: '5.0',
        totalAds: 1,
        registeredAt: nowISO
      },
      characteristics: parsedCharacteristics,
      moderationHistory: []
    };

    dataStore.ads.unshift(newAd);

    return res.status(201).json({
      message: 'Объявление успешно создано',
      ad: newAd
    });
  } catch (error) {
    res.status(500).json({
      error: 'Ошибка при создании объявления',
      message: error.message
    });
  }
};


module.exports = {
  getAds,
  getAdById,
  approveAd,
  rejectAd,
  requestChanges,
  createAd
};
