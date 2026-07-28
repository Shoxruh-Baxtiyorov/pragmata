import { useQuery } from '@tanstack/react-query'
import { api } from '@/shared/api/client'
import type { AppearancesPage } from '@/shared/api/types'

export function useAppearances(onlyNamed: boolean, hours = 168) {
  return useQuery({
    queryKey: ['appearances', onlyNamed, hours],
    queryFn: () =>
      api.get<AppearancesPage>(
        `/api/v1/appearances?only_named=${onlyNamed}&hours=${hours}&limit=80`,
      ),
    refetchInterval: 5000, // журнал живой — подтягиваем новые визиты
  })
}
