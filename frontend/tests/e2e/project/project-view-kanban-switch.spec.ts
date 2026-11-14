import {test, expect} from '../../support/fixtures'
import {BucketFactory} from '../../factories/bucket'
import {ProjectFactory} from '../../factories/project'
import {TaskFactory} from '../../factories/task'
import {ProjectViewFactory} from '../../factories/project_view'
import {TaskBucketFactory} from '../../factories/task_buckets'

test.describe('Project View Kanban', () => {
	test('Shows the right board after leaving a bucket title edit for another project', async ({authenticatedPage: page}) => {
		await ProjectFactory.create(1, {id: 1, title: 'Website'}, false)
		await ProjectFactory.create(1, {id: 2, title: 'Mobile app'}, false)
		await ProjectViewFactory.create(1, {id: 4, project_id: 1, view_kind: 3, bucket_configuration_mode: 1}, false)
		await ProjectViewFactory.create(1, {id: 8, project_id: 2, view_kind: 3, bucket_configuration_mode: 1}, false)
		await BucketFactory.create(1, {id: 1, project_view_id: 4, title: 'Ideas'}, false)
		await BucketFactory.create(1, {id: 2, project_view_id: 4, title: 'Shipped'}, false)
		await BucketFactory.create(1, {id: 3, project_view_id: 8, title: 'Backlog'}, false)
		await BucketFactory.create(1, {id: 4, project_view_id: 8, title: 'Released'}, false)
		await TaskFactory.create(1, {id: 1, project_id: 2, title: 'Fix the login screen'}, false)
		await TaskBucketFactory.create(1, {task_id: 1, bucket_id: 3, project_view_id: 8}, false)

		// A slow connection: saving a bucket takes a moment.
		const saved = page.waitForResponse(r => r.url().endsWith('/projects/1/views/4/buckets/1') && r.request().method() === 'POST')
		await page.route(/\/projects\/1\/views\/4\/buckets\/1$/, async route => {
			if (route.request().method() === 'POST') {
				await new Promise(resolve => setTimeout(resolve, 1500))
			}
			await route.continue()
		})

		await page.goto('/projects/1/4')
		const title = page.locator('.kanban .bucket .bucket-header .title').first()
		await expect(title).toContainText('Ideas')
		await title.click()
		await title.fill('Ideas for later')

		await page.locator('.menu-list .list-menu-link').filter({hasText: 'Mobile app'}).click()
		await expect(page).toHaveURL(/\/projects\/2\/8/)
		const board = page.locator('.kanban')
		await expect(board.locator('.bucket .title')).toHaveText(['Backlog', 'Released'])
		await saved

		await expect(board.locator('.bucket .title')).toHaveText(['Backlog', 'Released'])
		await expect(board.locator('.bucket').first()).toContainText('Fix the login screen')
	})
})
