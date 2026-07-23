"use client";

import {
  useEffect,
  useState,
} from "react";
import { PageHeader } from "@/components/ui/page-header";
import {
  getAppUsers,
  roles,
  saveAppUsers,
  type AppUser,
  type UserRole,
} from "@/lib/users";
import styles from "./users.module.css";

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setUsers(getAppUsers());
  }, []);

  function addUser() {
    setUsers((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        name: "Nieuwe gebruiker",
        email: "",
        role: "Alleen lezen",
        active: true,
      },
    ]);
  }

  function update(
    id: string,
    changes: Partial<AppUser>,
  ) {
    setSaved(false);
    setUsers((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, ...changes }
          : user,
      ),
    );
  }

  return (
    <div>
      <PageHeader
        eyebrow="Bedrijfsinstellingen"
        title="Gebruikers en rechten"
        description="Beheer gebruikers en wijs een eenvoudige standaardrol toe."
        action={
          <button
            className="button button-primary"
            type="button"
            onClick={addUser}
          >
            + Gebruiker
          </button>
        }
      />

      {saved && (
        <div className={styles.success}>
          ✓ Gebruikers opgeslagen.
        </div>
      )}

      <section className="content-card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Naam</th>
                <th>E-mail</th>
                <th>Rol</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <input
                      className={styles.input}
                      value={user.name}
                      onChange={(event) =>
                        update(user.id, {
                          name: event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      className={styles.input}
                      type="email"
                      value={user.email}
                      onChange={(event) =>
                        update(user.id, {
                          email:
                            event.target.value,
                        })
                      }
                    />
                  </td>
                  <td>
                    <select
                      className={styles.input}
                      value={user.role}
                      onChange={(event) =>
                        update(user.id, {
                          role: event.target
                            .value as UserRole,
                        })
                      }
                    >
                      {roles.map((role) => (
                        <option key={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <label className={styles.check}>
                      <input
                        type="checkbox"
                        checked={user.active}
                        onChange={(event) =>
                          update(user.id, {
                            active:
                              event.target.checked,
                          })
                        }
                      />
                      {user.active
                        ? "Actief"
                        : "Inactief"}
                    </label>
                  </td>
                  <td className="table-number">
                    {user.id !== "user-daan" && (
                      <button
                        className={styles.delete}
                        type="button"
                        onClick={() =>
                          setUsers((current) =>
                            current.filter(
                              (item) =>
                                item.id !== user.id,
                            ),
                          )
                        }
                      >
                        Verwijderen
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.roles}>
          <strong>Standaardrollen</strong>
          <p>
            Administrator heeft volledige toegang.
            Sales werkt met klanten, orders en
            retouren. Inkoop met leveranciers en
            inkooporders. Magazijn met voorraad en
            warehouse. Finance met facturen,
            debiteuren en Exact. Alleen lezen kan
            niets wijzigen.
          </p>
        </div>

        <div className={styles.actions}>
          <button
            className="button button-primary"
            type="button"
            onClick={() => {
              saveAppUsers(users);
              setSaved(true);
            }}
          >
            Gebruikers opslaan
          </button>
        </div>
      </section>
    </div>
  );
}
