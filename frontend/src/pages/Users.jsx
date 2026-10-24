import { useState } from 'react'
import { api } from '../services/api'
import useLoad from '../lib/useLoad'
import { dateLabel } from '../lib/format'
import PageHeader from '../components/PageHeader'
import {
  Card, Empty, ErrorBox, Field, FormGrid, Input, LinkButton, Loading, Modal, PrimaryButton, Row,
  SecondaryButton, Select, Status, Table, Tag, Td, Toggle,
} from '../components/ui'

export default function Users() {
  const { data: users, loading, error, reload } = useLoad(() => api.get('/api/users'))

  const [editing, setEditing] = useState(null) // null = closed, {} = new, user = edit

  return (
    <>
      <PageHeader
        eyebrow="ADMIN"
        title="Users"
        subtitle="Admins manage users. Employees can currently see and edit everything else."
        actions={<PrimaryButton onClick={() => setEditing({})}>+ New user</PrimaryButton>}
      />
      <Card
        eyebrow="TEAM"
        title={`${users?.length || 0} user${users?.length === 1 ? '' : 's'}`}
      >
        <ErrorBox message={error} />

        {loading ? (
          <Loading />
        ) : !users?.length ? (
          <Empty title="No users" />
        ) : (
          <Table columns={[{ label: 'Name' }, { label: 'Email' }, { label: 'Role' }, { label: 'Added' }, { label: 'Status' }, { label: '' }]}>
            {users.map((u) => (
              <Row key={u.id}>
                <Td><strong>{u.name}</strong></Td>
                <Td>{u.email}</Td>
                <Td><Tag color={u.role === 'ADMIN' ? 'purple' : 'blue'}>{u.role}</Tag></Td>
                <Td className="text-xs text-[#667085]">{dateLabel(u.createdAt)}</Td>
                <Td><Status status={u.enabled ? 'ACTIVE' : 'INACTIVE'} /></Td>
                <Td className="text-right"><LinkButton onClick={() => setEditing(u)}>Edit</LinkButton></Td>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      {editing && (
        <UserModal
          user={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </>
  )
}

function UserModal({ user, onClose, onSaved }) {
  const isNew = !user

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'EMPLOYEE',
    enabled: user?.enabled ?? true,
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const setField = (field, value) => setForm((old) => ({ ...old, [field]: value }))

  const save = async () => {
    setSaving(true)
    setError('')

    try {
      if (isNew) {
        await api.post('/api/users', {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
        })
      } else {
        await api.patch(`/api/users/${user.id}`, {
          name: form.name,
          email: form.email,
          role: form.role,
          enabled: form.enabled,
          version: user.version,
          ...(form.password && { password: form.password }),
        })
      }

      onSaved()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={isNew ? 'New user' : `Edit ${user.name}`}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isNew ? 'Create user' : 'Save changes'}
          </PrimaryButton>
        </>
      }
    >
      <div className="grid gap-4">
        <ErrorBox message={error} />

        <FormGrid>
          <Field label="Name" required>
            <Input autoFocus value={form.name} onChange={(e) => setField('name', e.target.value)} />
          </Field>

          <Field label="Email" required>
            <Input type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          </Field>

          <Field label={isNew ? 'Password' : 'New password'} required={isNew} hint={isNew ? null : 'Leave empty to keep the current one'}>
            <Input type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} />
          </Field>

          <Field label="Role">
            <Select value={form.role} onChange={(e) => setField('role', e.target.value)}>
              <option value="EMPLOYEE">Employee</option>
              <option value="ADMIN">Admin</option>
            </Select>
          </Field>

          {!isNew && (
            <Field label="Login">
              <div>
                <Toggle checked={form.enabled} onClick={() => setField('enabled', !form.enabled)}>
                  Can log in
                </Toggle>
              </div>
            </Field>
          )}
        </FormGrid>
      </div>
    </Modal>
  )
}
