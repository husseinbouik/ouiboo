import { useWatch, type Control, type UseFormSetValue } from 'react-hook-form';
import type { CreateTripInput } from '@ouiboo/schemas';

type StringArrayFieldName = 'inclusions' | 'exclusions' | 'checklist';

export function useStringArrayField(
  control: Control<CreateTripInput>,
  setValue: UseFormSetValue<CreateTripInput>,
  name: StringArrayFieldName,
) {
  const values = useWatch({ control, name }) ?? [];

  const update = (nextValues: string[]) => {
    setValue(name, nextValues, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return {
    fields: values.map((value, index) => ({
      id: `${name}-${index}`,
      value,
    })),
    append: (value: string) => update([...values, value]),
    remove: (index: number) => {
      update(values.filter((_, valueIndex) => valueIndex !== index));
    },
  };
}
