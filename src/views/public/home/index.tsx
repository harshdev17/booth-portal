import { listOpenCategories } from '@/lib/applications/categories'
import PublicHomeClient from './PublicHomeClient'

/**
 * PublicHome server component that fetches category data from the DB
 * and hands off to PublicHomeClient for bilingual language switching (Hindi/English).
 */
const PublicHome = async () => {
  const rawCategories = await listOpenCategories()

  const categories = rawCategories.map((category, index) => ({
    slug: category.slug,
    name: category.name,
    nameHi: category.name_hi,
    description: category.description,
    selectionMethod: category.selection_method,
    displayIndex: index + 1
  }))

  return <PublicHomeClient categories={categories} />
}

export default PublicHome
