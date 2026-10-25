import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:8000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer dev-kortexa-secret-token'
  },
});

// Busca Reels com paginação, busca e filtros
export async function fetchReels(limit = 20, offset = 0, q = '', liked = false, archived = false, folder_id = null) {
  const { data } = await api.get('/reels', { params: { limit, offset, q, liked, archived, folder_id } });
  return data;
}

// Inicia o processamento de um Reel; retorna job_id
export async function saveReel(url) {
  const { data } = await api.post('/reels/save', { url });
  return data.job_id;
}

// Verifica o status de um job
export async function checkJobStatus(jobId) {
  const { data } = await api.get(`/reels/status/${jobId}`);
  return data;
}

// Deleta um Reel salvo
export async function deleteReel(reelId) {
  await api.delete(`/reels/${reelId}`);
}

// URL do .txt com o conteúdo completo (transcrição integral) do Reel
export function getTranscriptUrl(reelId) {
  return `${BASE_URL}/reels/${reelId}/transcript`;
}

// Polling com suporte a cancelamento (AbortSignal) e timeout
export async function waitForJob(jobId, onStep, signal) {
  let attempts = 0;
  while (true) {
    if (signal?.aborted) {
      throw new Error('Cancelado pelo usuário');
    }

    try {
      const status = await checkJobStatus(jobId);
      if (onStep) onStep(status.step);

      if (status.status === 'done') {
        return status.reel;
      } else if (status.status === 'error') {
        throw new Error(status.error || 'Erro desconhecido');
      }
    } catch (e) {
      if (e.message !== 'Cancelado pelo usuário') {
        throw e;
      }
    }

    attempts++;
    if (attempts > 90) throw new Error('Tempo limite excedido'); // ~3 minutos

    // Aguarda 2 segundos antes de tentar novamente
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Associa um Reel a uma pasta específica
export async function assignReelToFolder(reelId, folderId) {
  try {
    const { data } = await api.patch(`/reels/${reelId}`, { folder_id: folderId });
    return data;
  } catch (error) {
    console.warn('Erro ao associar pasta no backend', error.message);
    return { success: false };
  }
}

// Atualiza metadados do reel (like, archive, tags)
export async function updateReel(reelId, updates) {
  try {
    const { data } = await api.patch(`/reels/${reelId}`, updates);
    return data;
  } catch (error) {
    console.warn('Backend sem rota de patch, mocking sucesso localmente', error.message);
    return { success: true };
  }
}
