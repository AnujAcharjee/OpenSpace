import { useState } from "react"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Controller,
  useForm,
  DefaultValues,
  FieldValues,
  Path,
} from "react-hook-form"
import { IconLoader } from "@tabler/icons-react"
import { zodResolver } from "@hookform/resolvers/zod"
import { ZodTypeAny } from "zod"

export interface RadioOption {
  label: string
  value: string
}

export interface FieldConfig<T extends FieldValues> {
  name: Path<T>
  label: string
  placeholder?: string
  autoComplete?: string
  type?: string
  fieldType?: "input" | "radio"
  options?: RadioOption[]
}

export interface AppFormProps<T extends FieldValues> {
  formId: string
  schema: ZodTypeAny
  defaultValues: DefaultValues<T>
  fields: FieldConfig<T>[]
  onSubmit: (data: T) => Promise<void> | void
  submitLabel?: string
  pendingLabel?: string
}

function AppForm<T extends FieldValues>({
  formId,
  schema,
  defaultValues,
  fields,
  onSubmit,
  submitLabel = "Submit",
  pendingLabel = "Processing...",
}: AppFormProps<T>) {
  const [isPending, setIsPending] = useState(false)

  const form = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues,
  })

  const handleSubmit = async (data: T) => {
    setIsPending(true)
    try {
      await onSubmit(data)
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form id={formId} onSubmit={form.handleSubmit(handleSubmit)}>
      <FieldGroup>
        {fields.map((fieldConfig) => (
          <Controller
            key={String(fieldConfig.name)}
            name={fieldConfig.name}
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={`${formId}-${String(fieldConfig.name)}`}>
                  {fieldConfig.label}
                </FieldLabel>

                {fieldConfig.fieldType === "radio" ? (
                  <div className="flex gap-4">
                    {fieldConfig.options?.map((option) => (
                      <label
                        key={option.value}
                        className="flex cursor-pointer items-center gap-2 text-sm text-ink"
                      >
                        <input
                          type="radio"
                          value={option.value}
                          checked={field.value === option.value}
                          onChange={() => field.onChange(option.value)}
                          className="accent-[var(--pencil-teal)]"
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                ) : (
                  <Input
                    {...field}
                    id={`${formId}-${String(fieldConfig.name)}`}
                    type={fieldConfig.type ?? "text"}
                    aria-invalid={fieldState.invalid}
                    placeholder={fieldConfig.placeholder}
                    autoComplete={fieldConfig.autoComplete}
                  />
                )}

                {fieldState.invalid && (
                  <FieldError errors={[fieldState.error]} />
                )}
              </Field>
            )}
          />
        ))}

        <Button
          type="submit"
          disabled={isPending}
          form={formId}
          className="w-full font-semibold shadow-xs"
        >
          {isPending ? (
            <>
              <IconLoader className="size-4 animate-spin" />
              {pendingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </FieldGroup>
    </form>
  )
}

export default AppForm
