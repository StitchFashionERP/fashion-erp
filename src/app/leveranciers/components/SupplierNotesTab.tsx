"use client";

import styles from "../suppliers.module.css";
import {
  createSupplierId,
  type SetSupplier,
  type Supplier,
} from "./types";

type Props = {
  supplier: Supplier;
  setSupplier: SetSupplier;
  newNote: string;
  setNewNote: (value: string) => void;
};

export function SupplierNotesTab({
  supplier,
  setSupplier,
  newNote,
  setNewNote,
}: Props) {
  function addNote() {
    const trimmedNote = newNote.trim();

    if (!trimmedNote) {
      return;
    }

    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      notes: [
        {
          id: createSupplierId("note"),
          text: trimmedNote,
          createdAt: new Date().toISOString(),
        },
        ...currentSupplier.notes,
      ],
    }));

    setNewNote("");
  }

  function removeNote(noteId: string) {
    setSupplier((currentSupplier) => ({
      ...currentSupplier,
      notes: currentSupplier.notes.filter(
        (note) => note.id !== noteId,
      ),
    }));
  }

  function formatDate(value: string) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat("nl-NL", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  }

  return (
    <>
      <div className={styles.sectionHeader}>
        <div>
          <h3>Notities</h3>
          <p>
            Leg afspraken, bijzonderheden en interne informatie
            vast.
          </p>
        </div>
      </div>

      <section className={styles.card}>
        <label>
          <span>Nieuwe notitie</span>

          <textarea
            rows={5}
            value={newNote}
            placeholder="Schrijf hier een interne notitie..."
            onChange={(event) =>
              setNewNote(event.target.value)
            }
          />
        </label>

        <button
          type="button"
          className="button button-primary"
          disabled={!newNote.trim()}
          onClick={addNote}
        >
          Notitie toevoegen
        </button>
      </section>

      {supplier.notes.length === 0 ? (
        <div className={styles.emptyState}>
          Nog geen notities toegevoegd.
        </div>
      ) : (
        supplier.notes.map((note) => (
          <section
            key={note.id}
            className={styles.card}
          >
            <div className={styles.sectionHeader}>
              <span>{formatDate(note.createdAt)}</span>

              <button
                type="button"
                className="button button-danger"
                onClick={() => removeNote(note.id)}
              >
                Verwijderen
              </button>
            </div>

            <p>{note.text}</p>
          </section>
        ))
      )}
    </>
  );
}