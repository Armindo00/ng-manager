import type { CoachPickup } from "../types";

type Props = {
  pickups: CoachPickup[];
  onChange: (pickups: CoachPickup[]) => void;
};

function PickupManager({ pickups, onChange }: Props) {
  function updatePickup(index: number, field: "location" | "time", value: string) {
    const updated = [...pickups];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    onChange(updated);
  }

  function addPickup() {
    if (pickups.length >= 5) return;

    onChange([
      ...pickups,
      {
        id: crypto.randomUUID(),
        location: "",
        time: "",
      },
    ]);
  }

  function removePickup(id: string) {
    onChange(pickups.filter((pickup) => pickup.id !== id));
  }

  return (
    <div>
      <h4>Pickups</h4>

      {pickups.map((pickup, index) => (
        <div className="form-row" key={pickup.id}>
          <input
            placeholder={"Pickup " + (index + 1)}
            value={pickup.location}
            onChange={(e) => updatePickup(index, "location", e.target.value)}
          />

          <input
            type="time"
            value={pickup.time}
            onChange={(e) => updatePickup(index, "time", e.target.value)}
          />

          <button className="danger-btn" onClick={() => removePickup(pickup.id)}>
            Remover
          </button>
        </div>
      ))}

      {pickups.length < 5 && (
        <button className="primary-btn" onClick={addPickup}>
          Adicionar pickup
        </button>
      )}
    </div>
  );
}

export default PickupManager;
